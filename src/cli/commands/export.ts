import type { Command } from 'commander'
import { ConfigManager } from '@/config/manager'
import { GitCollector } from '@/git/collector'
import { LLMFactory } from '@/llm/factory'
import { ReviewWorkflow } from '@/pocketflow/workflow'
import { BeadsExternalClient } from '@/beads/external-client'
import { MemoryManager } from '@/beads/memory'
import { DocxExporter } from '@/reports/exporters/docx'
import { PdfExporter } from '@/reports/exporters/pdf'
import { PptxExporter } from '@/reports/exporters/pptx'
import { XlsxExporter } from '@/reports/exporters/xlsx'
import { buildWebDashboard } from '@/reports/web-builder'
import { ReportWriterNode } from '@/pocketflow/nodes/report-writer.js'
import type { SharedStore } from '@/pocketflow/types.js'

export async function executeExport(options: { format: string; output?: string; range?: string }): Promise<void> {
  const configManager = new ConfigManager()
  const config = await configManager.load()

  // Validate format
  const validFormats = ['terminal', 'markdown', 'html', 'json', 'docx', 'pdf', 'pptx', 'xlsx']
  if (!validFormats.includes(options.format)) {
    throw new Error(`Invalid format: ${options.format}. Valid formats: ${validFormats.join(', ')}`)
  }

  // Gather git data
  const gitCollector = new GitCollector()
  const range = options.range || config.review?.defaultRange || 'HEAD~10..HEAD'
  const gitData = await gitCollector.collect(range)

  // Create LLM adapter
  const providerConfig = config.providers.find((p) => p.name === config.activeProvider)
  if (!providerConfig) {
    throw new Error('No active LLM provider configured')
  }
  const llmAdapter = LLMFactory.create(providerConfig)

  // Initialize Beads if enabled
  let beadsClient: BeadsExternalClient | null = null
  if (config.beads?.external?.enabled) {
    beadsClient = new BeadsExternalClient(config.beads.external)
    await beadsClient.init()
  }

  // Initialize custom memory
  const memoryManager = new MemoryManager(config.beads?.custom)
  await memoryManager.init()

  // Create agents
  const agents = [
    new (await import('@/agents/code-quality')).CodeQualityAgent(),
    new (await import('@/agents/security')).SecurityAgent(),
    new (await import('@/agents/performance')).PerformanceAgent(),
    new (await import('@/agents/architecture')).ArchitectureAgent(),
    new (await import('@/agents/dependency')).DependencyAgent(),
    new (await import('@/agents/git-history')).GitHistoryAgent(),
  ]

  // Create and run workflow
  const workflow = new ReviewWorkflow()
  const sharedStore = await workflow.run({
    config: config,
    gitData,
    llmAdapter,
    beadsClient,
    memoryManager,
    agents,
  })

  // Set the desired output format in config for ReportWriterNode
  const storeWithFormat: SharedStore = {
    ...sharedStore,
    config: {
      ...sharedStore.config,
      output: {
        ...sharedStore.config?.output,
        format: options.format as any,
      },
    },
  }

  // Generate report using ReportWriterNode
  const reportWriter = new ReportWriterNode()
  const report = await reportWriter.run(storeWithFormat)

  // For binary formats (docx, pdf, pptx, xlsx), the report sections contain the file content
  // Actually ReportWriterNode only generates markdown/terminal/html. For binary formats we need to use exporters directly.
  // So we need to handle binary formats separately.

  let outputBuffer: Buffer | undefined
  let outputString = report.sections.map((s) => `## ${s.title}\n\n${s.content}`).join('\n---\n\n')

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
    // ReportWriterNode already generates HTML in a single section
    outputString = report.sections[0]?.content || outputString
  }
  // markdown and terminal use outputString as is

  // Write output
  if (options.output) {
    const fs = await import('fs')
    const dir = require('path').dirname(options.output)
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    if (outputBuffer !== undefined) {
      fs.writeFileSync(options.output, outputBuffer)
    } else {
      fs.writeFileSync(options.output, outputString)
    }
  } else {
    // Write to stdout
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
    .action(async (options: { format?: string; output?: string; range?: string }) => {
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
