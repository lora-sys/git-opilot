import { BaseAgent } from './base.js'
import type { LLMAdapter } from '../llm/adapter.js'
import type { ChatMessage } from '../llm/adapter.js'
import type { FileContent, AgentDependencies } from './types.js'

export class CodeQualityAgent extends BaseAgent {
  private static SOURCE_EXTENSIONS = [
    '.ts',
    '.js',
    '.py',
    '.java',
    '.go',
    '.rs',
    '.c',
    '.cpp',
    '.h',
    '.hpp',
    '.cs',
    '.php',
    '.rb',
    '.swift',
    '.kt',
    '.kts',
    '.scala',
    '.m',
    '.mm',
    '.sql',
    '.sh',
    '.bash',
    '.ps1',
  ]

  constructor(llm: LLMAdapter, deps: AgentDependencies) {
    super('code-quality', 'quality', llm, {}, deps)
  }

  protected filterSourceFiles(files: FileContent[]): FileContent[] {
    return files.filter((file) => {
      const ext = '.' + file.path.split('.').pop()?.toLowerCase()
      return CodeQualityAgent.SOURCE_EXTENSIONS.includes(ext)
    })
  }

  protected async buildPrompt(files: FileContent[], context: any): Promise<ChatMessage[]> {
    const systemPrompt = `You are an expert code reviewer focused on code quality and maintainability.

Your task is to analyze source code for:
- cyclomatic complexity (functions with many branches)
- code duplication (copy-pasted blocks)
- naming conventions violations (unclear names, single-letter vars)
- SOLID principles violations
- dead code (unused variables, functions, imports)

IMPORTANT: Respond ONLY with a valid JSON array of findings. Each finding object must have:
{
  "type": "quality",
  "severity": "critical" | "high" | "medium" | "low" | "info",
  "filePath": "string (optional but strongly preferred)",
  "lineRange": { "start": number, "end": number } | null,
  "message": "string (describe the issue)",
  "suggestion": "string (optional, how to fix)",
  "codeExample": "string (optional, improved code snippet)"
}

Be precise. Include file paths and line numbers when possible.`

    const contextSection = context ? `Context:\n${context}\n\n` : 'Context:\nNone\n\n'

    const filesSection = 'Files to analyze:\n' + files.map((f) => `--- ${f.path} ---\n${f.content}`).join('\n')

    const userPrompt = contextSection + filesSection

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]
  }

  protected parseResponse(content: string): import('./types.js').AgentFinding[] {
    try {
      // Try to extract JSON from the response (in case LLM adds extra text)
      const jsonMatch = content.match(/\[.*\]/s)
      const jsonStr = jsonMatch ? jsonMatch[0] : content

      const data = JSON.parse(jsonStr)

      if (!Array.isArray(data)) {
        throw new Error('Response is not an array')
      }

      // Validate and normalize each finding
      return data.map((item: any) => ({
        type: item.type || 'quality',
        severity: this.normalizeSeverity(item.severity),
        filePath: item.filePath,
        lineRange: item.lineRange === null ? undefined : item.lineRange,
        message: item.message || 'No message provided',
        suggestion: item.suggestion,
        codeExample: item.codeExample,
      }))
    } catch (error) {
      // Return a single finding indicating parse failure
      return [
        {
          type: 'quality',
          severity: 'medium',
          message: `Failed to parse LLM response: ${(error as Error).message}. Raw: ${content.substring(0, 200)}`,
          suggestion: 'Try simplifying the output format',
        },
      ]
    }
  }

  private normalizeSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    const normalized = severity?.toLowerCase()
    if (
      normalized === 'critical' ||
      normalized === 'high' ||
      normalized === 'medium' ||
      normalized === 'low' ||
      normalized === 'info'
    ) {
      return normalized
    }
    return 'medium' // default
  }

  async analyze(files: FileContent[], context?: any): Promise<import('./types.js').AgentResult> {
    const startTime = Date.now()

    // Filter relevant files
    const relevantFiles = this.filterSourceFiles(files)

    // Build prompt
    const messages = await this.buildPrompt(relevantFiles, context)

    // Call LLM - returns content string
    const content = await this.llm.chat(messages)

    // Parse response
    const findings = this.parseResponse(content)

    // Count tokens used for response
    const tokensUsed = await this.llm.countTokens(content)

    const duration = Math.max(1, Date.now() - startTime)

    return {
      agentName: this.name,
      findings,
      tokensUsed,
      duration,
    }
  }
}
