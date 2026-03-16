import { BaseAgent } from './base.js'
import type { FileContent } from './types.js'

/**
 * ArchitectureAgent evaluates code architecture and design quality.
 *
 * Focus areas:
 * - Coupling (dependencies between modules)
 * - Cohesion (single responsibility within modules)
 * - SOLID principles violations
 * - Design patterns (appropriate use, anti-patterns)
 * - Modularity (clear boundaries, separation of concerns)
 * - Dependency direction (layering, dependency rule)
 * - Layering (proper abstraction levels)
 * - Testability (difficult to test due to tight coupling, static calls)
 */
export class ArchitectureAgent extends BaseAgent {
  private static readonly SOURCE_EXTENSIONS = [
    '.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte',
    '.py', '.java', '.go', '.rs', '.rb', '.php', '.cs', '.scala', '.kt', '.kts',
    '.c', '.cpp', '.h', '.hpp', '.m', '.mm', '.swift',
    '.sh', '.bash', '.ps1', '.pl',
    '.sql',
  ]

  constructor(llm: any, deps: any) {
    super('architecture', 'architecture', llm, {
      systemPrompt: `You are a software architecture expert analyzing code for design quality and maintainability.

Your task is to identify architectural and design issues:

Focus on:
- Coupling: high dependency between modules, tight coupling, circular dependencies
- Cohesion: low cohesion, God classes/objects, mixed responsibilities
- SOLID violations:
  - Single Responsibility: class doing too many things
  - Open/Closed: not open for extension, closed for modification
  - Liskov Substitution: subclass not substitutable for base class
  - Interface Segregation: fat interfaces, client-specific methods
  - Dependency Inversion: depending on concretions instead of abstractions
- Design patterns: missing appropriate patterns, misuse of patterns, over-engineering
- Modularity: unclear module boundaries, leakage of internal details, improper encapsulation
- Dependency direction: dependencies pointing inward (violating dependency rule), cycles in dependency graph
- Layering: skipping layers, mixing concerns across layers
- Testability: code difficult to test due to static calls, singletons, hidden dependencies, global state

For each finding, provide:
- type: architecture category (e.g., "coupling", "cohesion", "solid-violation", "design-pattern", "modularity", "dependency-direction", "layering", "testability")
- severity: "critical", "high", "medium", "low", or "info"
- filePath: path to the file
- lineRange: { start, end } if applicable
- message: clear description of the architectural issue
- suggestion: specific refactoring steps, design pattern recommendations

Return a JSON array of findings. If no issues found, return empty array [].

Focus on practical improvements and explain the reasoning.`,
      temperature: 0.2,
      maxTokens: 4000,
    }, deps)
  }

  async analyze(files: FileContent[], context?: any): Promise<any> {
    const startTime = Date.now()
    const prompt = await this.buildPrompt(files, context)
    const response = await this.llm.chat(prompt, {
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    })
    const findings = this.parseResponse(response.content)
    const duration = Math.max(1, Date.now() - startTime)
    return {
      agentName: this.name,
      findings,
      tokensUsed: response.tokensUsed,
      duration,
    }
  }

  protected filterFiles(files: FileContent[]): FileContent[] {
    return files.filter(file => {
      const ext = this.getExtension(file.path)
      return ArchitectureAgent.SOURCE_EXTENSIONS.includes(ext)
    })
  }

  protected async buildPrompt(
    files: FileContent[],
    context?: any
  ): Promise<{ role: string; content: string }[]> {
    const fileList = files.map(f => `- ${f.path}`).join('\n')

    let contextSection = ''
    if (context && context.length > 0) {
      const formattedContext = this.formatContext(context)
      contextSection = `\n\nPrevious findings from memory:\n${formattedContext}\n\n`
    }

    const content = `Analyze the following code files for architectural and design quality:

Files to analyze:
${fileList}

${contextSection}For each file, review for architecture issues:
- coupling (dependencies between modules)
- cohesion (single responsibility within modules)
- SOLID (SRP, OCP, LSP, ISP, DIP violations)
- design patterns (missing or misused patterns)
- modularity (clear boundaries, encapsulation)
- dependency direction (layering, dependency rule)
- layering (proper abstraction levels)
- testability (difficult to test due to static calls, globals)

Return findings as a JSON array:
[
  {
    "type": "architecture-category",
    "severity": "critical|high|medium|low|info",
    "filePath": "path/to/file",
    "lineRange": { "start": 10, "end": 20 } | null,
    "message": "Description of the architectural issue",
    "suggestion": "How to refactor or improve"
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
      return [{
        type: 'parse_error',
        severity: 'info',
        message: `Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }]
    }
  }

  private normalizeType(type: string): string {
    const normalized = type.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const valid = [
      'coupling', 'cohesion', 'solid-violation', 'design-pattern',
      'modularity', 'dependency-direction', 'layering', 'testability', 'other',
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
