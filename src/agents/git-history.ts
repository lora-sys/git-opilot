import { BaseAgent } from './base.js'
import type { FileContent } from './types.js'
import type { ChatMessage } from '../llm/adapter.js'

/**
 * GitHistoryAgent analyzes git commit history for issues.
 *
 * Focus areas:
 * - Commit hygiene (conventional commits, message quality)
 * - Secrets in history (API keys, passwords, tokens)
 * - Large files (binary blobs, large binaries)
 * - Merge commits (noisy history, unnecessary merges)
 * - Revert patterns (frequent reverts indicate instability)
 * - Commit message quality (vague messages, typos, tickets)
 * - Author attribution (correct attribution, signed commits)
 * - Frequency analysis (commit frequency, distribution)
 */
export class GitHistoryAgent extends BaseAgent {
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
    '.sql',
  ]

  constructor(llm: any, deps: any) {
    super(
      'git-history',
      'git-history',
      llm,
      {
        systemPrompt: `You are a git history and version control expert analyzing commit logs and code changes.

Your task is to identify version control and commit history issues:

Focus on:
- Commit hygiene: conventional commits format, clear messages, scope specification, breaking changes indicated
- Secrets in history: accidentally committed API keys, passwords, tokens, certificates, private keys
- Large files: binary files (images, videos, archives) in history, files >500KB that should be in releases
- Merge commits: excessive merge commits, merges that could be rebased, noisy history
- Revert patterns: frequent reverts indicate unstable features or poor review process
- Commit message quality: vague messages ("fix", "update"), typos, missing ticket references
- Author attribution: missing author info, incorrect email, lack of signed commits (GPG/SSH)
- Frequency analysis: commit sparsity (long gaps) or hyperactivity (many tiny commits), uneven distribution
- Change size: overly large commits with many files, mixing unrelated concerns
- Branching strategy: direct commits to main, long-lived branches without PRs

For each finding, provide:
- type: git issue category (e.g., "secret", "large-file", "merge-commit", "poor-message", "revert", "attribution", "frequency", "change-size", "branching")
- severity: "critical", "high", "medium", "low", or "info"
- filePath: path to the affected file (if applicable)
- lineRange: not typically applicable for git history, use null
- message: clear description of the issue
- suggestion: specific remediation (BFG for secrets, rebase/squash, amend message, GPG sign)

Return a JSON array of findings. If no issues found, return empty array [].

Note: The analysis is based on the git commit history provided in the context (previous findings) and the current files.`,
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
      return GitHistoryAgent.SOURCE_EXTENSIONS.includes(ext)
    })
  }

  protected async buildPrompt(files: FileContent[], context?: any): Promise<ChatMessage[]> {
    const fileList = files.map((f) => `- ${f.path}`).join('\n')

    let contextSection = ''
    if (context && context.length > 0) {
      const formattedContext = this.formatContext(context)
      contextSection = `\n\nPrevious findings from memory:\n${formattedContext}\n\n`
    }

    const content = `Analyze the git commit history and current files for version control issues:

Files to analyze (current snapshot):
${fileList}

${contextSection}Review for git history issues:
- commit hygiene (conventional commits, clear messages)
- secrets in history (accidentally committed credentials)
- large files (binaries in history)
- merge commits (noisy history)
- revert patterns (frequent reverts)
- commit message quality (vague, typos, missing tickets)
- author attribution (signed commits, correct email)
- frequency analysis (commit distribution)
- change size (overly large commits)
- branching strategy (direct main commits, long-lived branches)

Return findings as a JSON array:
[
  {
    "type": "git-issue-category",
    "severity": "critical|high|medium|low|info",
    "filePath": "path/to/file",
    "lineRange": null,
    "message": "Description of the git issue",
    "suggestion": "How to fix or improve"
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
      'secret',
      'large-file',
      'merge-commit',
      'poor-message',
      'revert',
      'attribution',
      'frequency',
      'change-size',
      'branching',
      'squash-opportunity',
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
