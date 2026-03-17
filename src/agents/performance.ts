import { BaseAgent } from './base.js'
import type { FileContent } from './types.js'
import type { ChatMessage } from '../llm/adapter.js'

/**
 * PerformanceAgent analyzes code for performance issues.
 *
 * Focus areas:
 * - Cyclomatic complexity (deeply nested logic)
 * - Algorithmic efficiency (O(n²) vs O(n log n))
 * - Memory leaks (unreleased resources, event listeners)
 * - N+1 query problems (database access in loops)
 * - Race conditions (unsynchronized async operations)
 * - Blocking calls (sync I/O on main thread)
 * - Unnecessary re-renders (React/UI frameworks)
 * - Bundle size (import bloat, unused code)
 */
export class PerformanceAgent extends BaseAgent {
  // Use same source extensions as CodeQualityAgent (all programming languages)
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
      'performance',
      'performance',
      llm,
      {
        systemPrompt: `You are a performance engineering expert analyzing code for efficiency and scalability issues.

Your task is to identify performance anti-patterns and optimization opportunities:

Focus on:
- Cyclomatic complexity: functions with many branches (>10), deeply nested if/loops
- Algorithmic efficiency: O(n²) or worse algorithms, unnecessary sorting, quadratic loops
- Memory leaks: unreleased resources, event listeners not removed, caching without eviction, global variables growing
- N+1 query problem: database queries inside loops, missing eager loading
- Race conditions: unsynchronized async operations, shared mutable state
- Blocking calls: synchronous I/O on main/event thread, heavy computation blocking
- Unnecessary re-renders: React components re-rendering without dependency changes, missing memoization
- Bundle size: large dependencies, unused code, duplicate packages
- Inefficient data structures: using array for lookups, linear searches on large datasets
- Caching opportunities: repeated calculations, missing memoization, expensive I/O without cache

For each finding, provide:
- type: performance category (e.g., "complexity", "inefficient-algorithm", "memory-leak", "n-plus-1", "race-condition", "blocking-call", "unnecessary-render", "bundle-size", "caching-opportunity")
- severity: "critical", "high", "medium", "low", or "info"
- filePath: path to the file
- lineRange: { start, end } if applicable
- message: clear description of the performance issue
- suggestion: specific optimization steps, code example if helpful

Return a JSON array of findings. If no issues found, return empty array [].

Be specific and quantify impact when possible (e.g., "O(n²) complexity will degrade to 10s of seconds for 10k records").`,
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
      return PerformanceAgent.SOURCE_EXTENSIONS.includes(ext)
    })
  }

  protected async buildPrompt(files: FileContent[], context?: any): Promise<ChatMessage[]> {
    const fileList = files.map((f) => `- ${f.path}`).join('\n')

    let contextSection = ''
    if (context && context.length > 0) {
      const formattedContext = this.formatContext(context)
      contextSection = `\n\nPrevious findings from memory:\n${formattedContext}\n\n`
    }

    const content = `Analyze the following code files for performance issues:

Files to analyze:
${fileList}

${contextSection}For each file, review for performance anti-patterns:
- cyclomatic complexity (deeply nested logic)
- algorithmic efficiency (O(n²), quadratic loops)
- memory leaks (unreleased resources, growing globals)
- N+1 queries (database access in loops)
- race conditions (unsynchronized async)
- blocking calls (sync I/O on main thread)
- unnecessary re-renders (UI frameworks)
- bundle size (import bloat, unused code)
- inefficient data structures (linear searches on large arrays)
- caching opportunities (repeated calculations)

Return findings as a JSON array:
[
  {
    "type": "performance-category",
    "severity": "critical|high|medium|low|info",
    "filePath": "path/to/file",
    "lineRange": { "start": 10, "end": 20 } | null,
    "message": "Description of the performance issue",
    "suggestion": "How to optimize or fix"
  }
]

If no issues found, return [].

Only return the JSON array, no other text.`

    return [{ role: 'user', content } as ChatMessage]
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
      'complexity',
      'inefficient-algorithm',
      'memory-leak',
      'n-plus-1',
      'race-condition',
      'blocking-call',
      'unnecessary-render',
      'bundle-size',
      'caching-opportunity',
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
