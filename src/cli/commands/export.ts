#!/usr/bin/env node

import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'
import { ConfigManager } from '@/config/manager.js'
import { GitCollector } from '@/git/collector.js'
import { LLMFactory } from '@/llm/factory.js'
import { ReviewWorkflow } from '@/pocketflow/workflow.js'
import { BeadsExternalClient } from '@/beads/external-client.js'
import { MemoryManager } from '@/beads/memory.js'
import { DocxExporter } from '@/reports/exporters/docx.js'
import { PdfExporter } from '@/reports/exporters/pdf.js'
import { PptxExporter } from '@/reports/exporters/pptx.js'
import { XlsxExporter } from '@/reports/exporters/xlsx.js'
import type { ProviderType } from '@/llm/factory.js'
import type { FileContent } from '@/agents/types.js'
import type { GitRepository } from '@/git/types.js'
import type { AgentDependencies } from '@/agents/types.js'
import Database from 'better-sqlite3'

// Simple logger
const logger = {
  debug: (...args: any[]) => console.debug('[git-copilot]', ...args),
  info: (...args: any[]) => console.info('[git-copilot]', ...args),
  warn: (...args: any[]) => console.warn('[git-copilot]', ...args),
  error: (...args: any[]) => console.error('[git-copilot]', ...args),
}

function createMemoryDb(): Database {
  const dataDir = join(homedir(), '.git-copilot', 'data')
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }
  const dbPath = join(dataDir, 'findings.db')
  return new Database(dbPath)
}

function isIgnored(filePath: string, ignorePatterns: string[]): boolean {
  return ignorePatterns.some((pattern) => filePath.includes(pattern) || filePath.startsWith(pattern))
}

export async function executeExport(options: { format: string; output?: string; range?: string }): Promise<void> {
  // Load configuration
  const configManager = new ConfigManager()
  const config = await configManager.loadConfig()

  // Validate format
  const validFormats: Array<'terminal' | 'markdown' | 'html' | 'json' | 'docx' | 'pdf' | 'pptx' | 'xlsx'> = [
    'terminal',
    'markdown',
    'html',
    'json',
    'docx',
    'pdf',
    'pptx',
    'xlsx',
  ]
  if (!validFormats.includes(options.format as any)) {
    throw new Error(`Invalid format: ${options.format}. Valid formats: ${validFormats.join(', ')}`)
  }

  // Set output format in config (for ReportWriterNode)
  config.output = { ...config.output, format: options.format as any }

  // Initialize Git collector
  const git = new GitCollector()

  // Gather repository information
  const repoInfo = await git.getRepositoryInfo()
  const tags = await git.getTags()
  const status = await git.getStatus()

  // Get commit history (limited)
  const maxCommits = 100
  const commits = await git.getCommitHistory({ maxCommits })

  // Get all tracked files and their content
  const trackedFiles = await git.getAllTrackedFiles()
  const files: FileContent[] = []
  for (const filePath of trackedFiles) {
    // Skip ignored files
    if (isIgnored(filePath, config.review.ignorePatterns)) continue
    // Limit number of files
    if (files.length >= config.review.maxFilesPerAgent) break
    try {
      const content = await git.getFileContent(filePath)
      files.push({ path: filePath, content })
    } catch (err: any) {
      // Skip files that can't be read
      logger.warn(`Could not read file ${filePath}: ${err.message}`)
    }
  }

  // Build repository object
  const repo: GitRepository = {
    root: repoInfo.root,
    currentBranch: repoInfo.currentBranch,
    branches: repoInfo.branches,
    tags,
    latestCommits: commits,
    status,
  }

  // Create LLM adapter
  const providerConfig = config.providers.find((p) => p.name === config.activeProvider)
  if (!providerConfig) {
    throw new Error('No active LLM provider configured')
  }
  if (!providerConfig.apiKey) {
    throw new Error(
      `API key not set for provider ${providerConfig.name}. Please configure with 'git-copilot config set providers.${providerConfig.name}.apiKey <your-key>'`
    )
  }
  const providerName = providerConfig.name as ProviderType
  const llmAdapter = LLMFactory.create(providerName, {
    apiKey: providerConfig.apiKey,
    baseUrl: providerConfig.baseUrl,
    model: providerConfig.model,
  })

  // Initialize Beads external client if enabled
  let beadsClient: BeadsExternalClient | null = null
  if (config.beads.external.enabled) {
    beadsClient = new BeadsExternalClient(config.beads.external)
    await beadsClient.init()
  }

  // Initialize custom memory
  const memoryDb = createMemoryDb()
  const memoryManager = new MemoryManager(memoryDb)

  // Create agents
  const agentDeps: AgentDependencies = {
    logger,
    memory: memoryManager,
    ...(beadsClient && { beadsClient: beadsClient }),
  }
  const agents = [
    new (await import('@/agents/code-quality')).CodeQualityAgent(llmAdapter, agentDeps),
    new (await import('@/agents/security')).SecurityAgent(llmAdapter, agentDeps),
    new (await import('@/agents/performance')).PerformanceAgent(llmAdapter, agentDeps),
    new (await import('@/agents/architecture')).ArchitectureAgent(llmAdapter, agentDeps),
    new (await import('@/agents/dependency')).DependencyAgent(llmAdapter, agentDeps),
    new (await import('@/agents/git-history')).GitHistoryAgent(llmAdapter, agentDeps),
  ]

  // Create and run workflow
  const workflow = new ReviewWorkflow(agents, config, memoryManager, beadsClient || undefined)
  const report = await workflow.run(files, repo)

  // Handle output based on format
  let outputBuffer: Buffer | undefined
  let outputString = ''

  if (options.format === 'json') {
    outputString = JSON.stringify(report, null, 2)
  } else if (options.format === 'docx') {
    const exporter = new DocxExporter()
    outputBuffer = await exporter.export(report)
  } else if (options.format === 'pdf') {
    const exporter = new PdfExporter()
    outputBuffer = await exporter.export(report)
  } else if (options.format === 'pptx') {
    const exporter = new PptxExporter()
    outputBuffer = await exporter.export(report)
  } else if (options.format === 'xlsx') {
    const exporter = new XlsxExporter()
    outputBuffer = await exporter.export(report)
  } else if (options.format === 'html') {
    outputString = report.sections[0]?.content || ''
  } else {
    // terminal or markdown
    outputString = report.sections.map((s) => `## ${s.title}\n\n${s.content}`).join('\n---\n\n')
  }

  // Write output
  if (options.output) {
    const outDir = dirname(options.output)
    if (outDir && !existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true })
    }
    if (outputBuffer !== undefined) {
      writeFileSync(options.output, outputBuffer)
    } else {
      writeFileSync(options.output, outputString)
    }
  } else {
    if (outputBuffer !== undefined) {
      process.stdout.write(outputBuffer)
    } else {
      console.log(outputString)
    }
  }
}

export function registerExportCommand(program: any) {
  program
    .command('export')
    .description('Export review report')
    .option('-f, --format <format>', 'Export format: terminal, markdown, html, json, docx, pdf, pptx, xlsx')
    .option('-o, --output <path>', 'Output file path')
    .option('-r, --range <range>', 'Commit range to export (e.g., HEAD~3..HEAD)')
    .action(async (options: { format: string; output?: string; range?: string }) => {
      if (!options.format) {
        console.error('Error: --format is required')
        process.exit(1)
      }
      try {
        await executeExport(options)
      } catch (error: any) {
        console.error(`Error: ${error.message}`)
        process.exit(1)
      }
    })
}
