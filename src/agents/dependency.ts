import { BaseAgent } from './base.js'
import type { FileContent } from './types.js'
import type { ChatMessage } from '../llm/adapter.js'

/**
 * DependencyAgent analyzes project dependencies for issues.
 *
 * Focus areas:
 * - CVE vulnerabilities in dependencies
 * - Outdated packages (major/minor updates)
 * - License compatibility issues
 * - Transitive dependencies (supply chain risk)
 * - Security advisories
 * - Version range specifications (loose ranges)
 * - Deprecated packages
 * - Bundle size impact (large dependencies)
 */
export class DependencyAgent extends BaseAgent {
  // Dependency manifest file patterns
  private static readonly MANIFEST_PATTERNS = [
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'requirements.txt',
    'constraints.txt',
    'go.mod',
    'go.sum',
    'Cargo.toml',
    'Cargo.lock',
    'composer.json',
    'composer.lock',
    'pom.xml',
    'build.gradle',
    'build.gradle.kts',
    'Gemfile',
    'Gemfile.lock',
    'pipfile',
    'pipfile.lock',
    'poetry.lock',
    'mix.exs',
  ]

  // Source files can also be analyzed for import patterns
  private static readonly SOURCE_EXTENSIONS = [
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.vue',
    '.svelte',
    '.py',
    '.java',
    '.go',
    '.rs',
    '.rb',
    '.php',
    '.cs',
    '.scala',
    '.kt',
    '.kts',
    '.c',
    '.cpp',
    '.h',
    '.hpp',
    '.m',
    '.mm',
    '.swift',
    '.sh',
    '.bash',
    '.ps1',
    '.pl',
  ]

  constructor(llm: any, deps: any) {
    super(
      'dependency',
      'dependency',
      llm,
      {
        systemPrompt: `You are a dependency and supply chain security expert analyzing project dependencies.

Your task is to identify dependency-related issues:

Focus on:
- CVE vulnerabilities: known CVEs in dependencies, exploitable versions
- Outdated packages: available updates (major/minor), end-of-life versions
- License compatibility: GPL-3.0, AGPL, non-OSI approved licenses in commercial projects
- Transitive dependencies: hidden vulnerabilities deep in the tree, supply chain risk
- Security advisories: known issues from maintainers, deprecation warnings
- Version ranges: loose ranges (^, ~, >=) that may pull unexpected versions
- Deprecated packages: abandoned, replaced, no longer maintained
- Bundle size impact: large dependencies, duplicate packages, unnecessary polyfills
- Misconfigurations: scripts executing on install, embedded binaries, postinstall hooks

For each finding, provide:
- type: dependency category (e.g., "cve", "outdated", "license", "transitive", "advisory", "deprecated", "bundle-size", "misconfiguration")
- severity: "critical", "high", "medium", "low", or "info"
- filePath: path to the manifest or source file
- lineRange: { start, end } if applicable
- message: clear description of the issue
- suggestion: specific remediation (version to upgrade, alternative package, config change)

Return a JSON array of findings. If no issues found, return empty array [].

When possible, provide exact version numbers and CVE IDs.`,
        temperature: 0.2,
        maxTokens: 4000,
      },
      deps
    )
  }

  async analyze(files: FileContent[], context?: any): Promise<any> {
    const startTime = Date.now()
    const prompt = await this.buildPrompt(files, context)
    const content = await this.llm.chat(prompt, {
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    })
    const findings = this.parseResponse(content)
    const tokensUsed = await this.llm.countTokens(content)
    const duration = Math.max(1, Date.now() - startTime)
    return {
      agentName: this.name,
      findings,
      tokensUsed,
      duration,
    }
  }

  protected filterFiles(files: FileContent[]): FileContent[] {
    return files.filter((file) => {
      const ext = this.getExtension(file.path)
      const isManifest = DependencyAgent.MANIFEST_PATTERNS.includes(file.path.split('/').pop() || '')
      const isSource = DependencyAgent.SOURCE_EXTENSIONS.includes(ext)
      // Include manifest files and source files
      return isManifest || isSource
    })
  }

  protected async buildPrompt(files: FileContent[], context?: any): Promise<ChatMessage[]> {
    const fileList = files.map((f) => `- ${f.path}`).join('\n')

    let contextSection = ''
    if (context && context.length > 0) {
      const formattedContext = this.formatContext(context)
      contextSection = `\n\nPrevious findings from memory:\n${formattedContext}\n\n`
    }

    const content = `Analyze the following project files for dependency and supply chain issues:

Files to analyze:
${fileList}

${contextSection}For each file, review for dependency problems:
- CVE (known vulnerabilities)
- outdated (updates available)
- license compatibility (incompatible licenses)
- transitive dependencies (deep dependency risks)
- security advisories (known issues from maintainers)
- version ranges (loose ranges that may pull unexpected versions)
- deprecated packages (abandoned or replaced)
- bundle size (large or duplicate dependencies)
- misconfiguration (dangerous install scripts)

Return findings as a JSON array:
[
  {
    "type": "dependency-category",
    "severity": "critical|high|medium|low|info",
    "filePath": "path/to/file",
    "lineRange": { "start": 10, "end": 20 } | null,
    "message": "Description of the dependency issue",
    "suggestion": "How to fix or mitigate"
  }
]

If no issues found, return [].

Only return the JSON array, no other text.`

    return [{ role: 'user', content }]
  }

  protected parseResponse(content: string): any[] {
    try {
      const jsonMatch = content.match(/\[.*\]/s)
      const jsonStr = jsonMatch ? jsonMatch[0] : content
      const parsed = JSON.parse(jsonStr)

      if (!Array.isArray(parsed)) {
        return [{ type: 'parse_error', severity: 'info', message: 'Expected JSON array' }]
      }

      return parsed.map((f: any) => ({
        type: this.normalizeType(f.type),
        severity: this.normalizeSeverity(f.severity),
        filePath: f.filePath ?? undefined,
        lineRange: f.lineRange ?? undefined,
        message: f.message || 'No message provided',
        suggestion: f.suggestion || undefined,
      }))
    } catch (error) {
      return [
        {
          type: 'parse_error',
          severity: 'info',
          message: `Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ]
    }
  }

  private normalizeType(type: string): string {
    const normalized = type.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const valid = [
      'cve',
      'outdated',
      'license',
      'transitive',
      'advisory',
      'deprecated',
      'bundle-size',
      'misconfiguration',
      'other',
    ]
    return valid.includes(normalized) ? normalized : 'other'
  }

  private normalizeSeverity(severity: string): string {
    const valid = ['critical', 'high', 'medium', 'low', 'info']
    const normalized = severity?.toLowerCase()
    return valid.includes(normalized) ? normalized : 'medium'
  }

  private getExtension(path: string): string {
    const match = path.match(/\.[^.]+$/)
    return match ? match[0].toLowerCase() : ''
  }
}
