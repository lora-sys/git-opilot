import { BaseAgent } from './base.js'
import type { FileContent } from './types.js'
import type { ChatMessage } from '../llm/adapter.js'

/**
 * SecurityAgent performs security analysis on code files.
 *
 * Focuses on OWASP Top 10 vulnerabilities:
 * - XSS (Cross-Site Scripting)
 * - SQL Injection
 * - CSRF (Cross-Site Request Forgery)
 * - Command Injection
 * - Hardcoded Secrets
 * - Insecure Deserialization
 * - XML External Entities (XXE)
 * - Security Misconfigurations
 * - Sensitive Data Exposure
 * - Broken Authentication/Authorization
 */
export class SecurityAgent extends BaseAgent {
  // Source file extensions to analyze (programming languages only, excluding config files)
  private static readonly SOURCE_EXTENSIONS = [
    // Web
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.vue',
    '.svelte',
    // Backend
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
    // Systems
    '.c',
    '.cpp',
    '.h',
    '.hpp',
    '.m',
    '.mm',
    '.swift',
    // Scripts
    '.sh',
    '.bash',
    '.ps1',
    '.pl',
    // Data
    '.sql',
  ]

  constructor(llm: any, deps: any) {
    super(
      'security',
      'security',
      llm,
      {
        systemPrompt: `You are a security expert analyzing code for vulnerabilities.
Your task is to identify security issues following OWASP Top 10 and other security best practices.

Focus on:
- XSS (Cross-Site Scripting): unsanitized user input in HTML/DOM, innerHTML usage, eval()
- SQL Injection: string concatenation in queries, missing parameterization
- CSRF: missing anti-CSRF tokens, unsafe state-changing operations
- Injection: command injection, LDAP injection, OS command execution
- Hardcoded Secrets: API keys, passwords, tokens, certificates in code
- Insecure Deserialization: unsafe JSON.parse(), pickle, YAML load
- XXE: XML external entity attacks in parsers
- Security Misconfigurations: default credentials, verbose error messages, unnecessary features enabled
- Sensitive Data Exposure: logs with PII, unencrypted data transmission
- Broken Authentication: weak password policies, missing MFA, session issues
- Authorization Bypass: missing permission checks, insecure direct object references
- SSRF: Server-Side Request Forgery, unfiltered URLs
- Path Traversal: unsanitized file paths, directory traversal
- Race Conditions: TOCTOU, unhandled concurrency issues

For each finding, provide:
- type: vulnerability category (e.g., "xss", "sql-injection", "csrf", "hardcoded-secret")
- severity: "critical", "high", "medium", "low", or "info"
- filePath: path to the file (from the input)
- lineRange: { start, end } if applicable
- message: clear description of the vulnerability
- suggestion: specific remediation steps

Return a JSON array of findings. If no vulnerabilities found, return empty array [].

Be precise and provide actionable recommendations.`,
        temperature: 0.1, // Low temperature for consistent security analysis
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

  /**
   * Filter files to analyze - include all source code files (including tests)
   */
  protected filterFiles(files: FileContent[]): FileContent[] {
    return files.filter((file) => {
      const ext = this.getExtension(file.path)
      return SecurityAgent.SOURCE_EXTENSIONS.includes(ext)
    })
  }

  /**
   * Build security-focused prompt with file list and optional context
   */
  protected async buildPrompt(files: FileContent[], context?: any): Promise<ChatMessage[]> {
    const fileList = files.map((f) => `- ${f.path}`).join('\n')

    let contextSection = ''
    if (context && context.length > 0) {
      const formattedContext = this.formatContext(context)
      contextSection = `\n\nPrevious findings from memory:\n${formattedContext}\n\n`
    }

    const content = `Analyze the following code files for OWASP Top 10 security vulnerabilities:

Files to analyze:
${fileList}

${contextSection}For each file, carefully review for security issues. Pay special attention to:
- XSS (Cross-Site Scripting)
- SQL injection
- CSRF (Cross-Site Request Forgery)
- injection attacks (command, LDAP, OS command)
- hardcoded secrets (API keys, passwords, tokens)
- Insecure deserialization
- XXE (XML External Entity)
- Security misconfigurations
- Sensitive data exposure
- Broken authentication
- authorization bypass
- SSRF (Server-Side Request Forgery)
- Path traversal
- Race conditions

Return findings as a JSON array with this structure:
[
  {
    "type": "vulnerability-category",
    "severity": "critical|high|medium|low|info",
    "filePath": "path/to/file",
    "lineRange": { "start": 10, "end": 20 } | null,
    "message": "Description of the vulnerability",
    "suggestion": "How to fix it"
  }
]

If no vulnerabilities found, return [].

Only return the JSON array, no other text.`

    return [{ role: 'user', content } as ChatMessage]
  }

  /**
   * Parse LLM response - extract JSON array of security findings
   */
  protected parseResponse(content: string): any[] {
    try {
      // Try to extract JSON from response (in case LLM adds extra text)
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

  /**
   * Normalize vulnerability type to canonical form
   */
  private normalizeType(type: string): string {
    const normalized = type.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const valid = [
      'xss',
      'sql-injection',
      'csrf',
      'injection',
      'hardcoded-secret',
      'insecure-deserialization',
      'xxe',
      'security-misconfiguration',
      'sensitive-data-exposure',
      'broken-authentication',
      'authorization-bypass',
      'ssrf',
      'path-traversal',
      'race-condition',
      'other',
    ]
    return valid.includes(normalized) ? normalized : 'other'
  }

  /**
   * Normalize severity to valid values
   */
  private normalizeSeverity(severity: string): string {
    const valid = ['critical', 'high', 'medium', 'low', 'info']
    const normalized = severity?.toLowerCase()
    return valid.includes(normalized) ? normalized : 'medium'
  }

  /**
   * Get file extension (lowercase)
   */
  private getExtension(path: string): string {
    const match = path.match(/\.[^.]+$/)
    return match ? match[0].toLowerCase() : ''
  }
}
