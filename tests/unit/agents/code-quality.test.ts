import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CodeQualityAgent } from '@/agents/code-quality.js'
import type { LLMAdapter } from '@/llm/adapter.js'
import type { FileContent, AgentDependencies, SharedStore } from '@/agents/types.js'

// Mock LLM
const createMockLLM = (responseContent: string, tokensUsed: number = 100) => {
  return {
    chat: vi.fn().mockResolvedValue(responseContent),
    countTokens: vi.fn().mockResolvedValue(tokensUsed),
  } as unknown as LLMAdapter
}

// Mock dependencies
const createMockDeps = (overrides: Partial<AgentDependencies> = {}): AgentDependencies => {
  return {
    memory: undefined,
    beadsClient: undefined,
    logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
    ...overrides,
  }
}

describe('CodeQualityAgent', () => {
  let agent: CodeQualityAgent
  let mockLLM: LLMAdapter
  let deps: AgentDependencies

  beforeEach(() => {
    mockLLM = createMockLLM('')
    deps = createMockDeps()
  })

  describe('file filtering', () => {
    it('should filter only source files (ts, js, py, etc.)', () => {
      const files: FileContent[] = [
        { path: 'src/index.ts', content: 'const x = 1;' },
        { path: 'src/readme.md', content: '# README' },
        { path: 'lib/util.js', content: 'function foo() {}' },
        { path: 'tests/test.py', content: 'def test(): pass' },
        { path: 'docs/guide.txt', content: 'Guide' },
        { path: 'src/analysis.java', content: 'public class A {}' },
        { path: 'src/main.go', content: 'package main' },
        { path: 'src/component.tsx', content: 'export const C = () => <div/>' },
      ]

      agent = new CodeQualityAgent(mockLLM, deps)
      const relevant = agent['filterSourceFiles'](files)

      expect(relevant).toHaveLength(5)
      expect(relevant.map((f) => f.path)).toContain('src/index.ts')
      expect(relevant.map((f) => f.path)).toContain('lib/util.js')
      expect(relevant.map((f) => f.path)).toContain('tests/test.py')
      expect(relevant.map((f) => f.path)).toContain('src/analysis.java')
      expect(relevant.map((f) => f.path)).toContain('src/main.go')
      expect(relevant.map((f) => f.path)).not.toContain('src/readme.md')
      expect(relevant.map((f) => f.path)).not.toContain('docs/guide.txt')
    })
  })

  describe('buildPrompt', () => {
    it('should include system prompt with code quality instructions', async () => {
      agent = new CodeQualityAgent(mockLLM, deps)
      const files: FileContent[] = [{ path: 'test.ts', content: 'const a = 1;' }]
      const context = 'Previous findings...'

      const messages = await agent['buildPrompt'](files, context)

      expect(messages).toHaveLength(2)
      expect(messages[0].role).toBe('system')
      expect(messages[0].content).toContain('code quality')
      expect(messages[0].content).toContain('cyclomatic complexity')
      expect(messages[0].content).toContain('code duplication')
      expect(messages[0].content).toContain('naming conventions')
      expect(messages[0].content).toContain('SOLID')
      expect(messages[0].content).toContain('dead code')

      expect(messages[1].role).toBe('user')
      expect(messages[1].content).toContain('Context:\nPrevious findings...')
      expect(messages[1].content).toContain('Files to analyze:\n--- test.ts ---\nconst a = 1;')
    })

    it('should handle empty context', async () => {
      agent = new CodeQualityAgent(mockLLM, deps)
      const files: FileContent[] = [{ path: 'a.ts', content: 'code' }]

      const messages = await agent['buildPrompt'](files, undefined)

      expect(messages[1].content).toContain('Context:\nNone')
    })
  })

  describe('parseResponse', () => {
    it('should parse valid JSON response into AgentFinding[]', () => {
      agent = new CodeQualityAgent(mockLLM, deps)

      const jsonResponse = JSON.stringify([
        {
          type: 'quality',
          severity: 'high',
          filePath: 'src/app.ts',
          lineRange: { start: 10, end: 15 },
          message: 'Function is too complex',
          suggestion: 'Split into smaller functions',
          codeExample: '// refactored code',
        },
        {
          type: 'quality',
          severity: 'medium',
          filePath: 'src/util.ts',
          lineRange: null,
          message: 'Variable name is unclear',
          suggestion: undefined,
          codeExample: undefined,
        },
      ])

      const findings = agent['parseResponse'](jsonResponse)

      expect(findings).toHaveLength(2)
      expect(findings[0]).toMatchObject({
        type: 'quality',
        severity: 'high',
        filePath: 'src/app.ts',
        lineRange: { start: 10, end: 15 },
        message: 'Function is too complex',
        suggestion: 'Split into smaller functions',
        codeExample: '// refactored code',
      })
      expect(findings[1]).toMatchObject({
        type: 'quality',
        severity: 'medium',
        filePath: 'src/util.ts',
        lineRange: undefined,
        message: 'Variable name is unclear',
        suggestion: undefined,
        codeExample: undefined,
      })
    })

    it('should handle non-JSON responses gracefully', () => {
      agent = new CodeQualityAgent(mockLLM, deps)

      const findings = agent['parseResponse']('Not JSON')

      expect(findings).toHaveLength(1)
      expect(findings[0].type).toBe('quality')
      expect(findings[0].severity).toBe('medium')
      expect(findings[0].message).toContain('Failed to parse')
    })

    it('should handle empty array', () => {
      agent = new CodeQualityAgent(mockLLM, deps)

      const findings = agent['parseResponse']('[]')

      expect(findings).toHaveLength(0)
    })
  })

  describe('analyze', () => {
    it('should return AgentResult with findings', async () => {
      const llmResponse = JSON.stringify([
        {
          type: 'quality',
          severity: 'high',
          filePath: 'test.ts',
          lineRange: { start: 1, end: 10 },
          message: 'Too complex',
          suggestion: 'Refactor',
          codeExample: '// simpler',
        },
      ])
      mockLLM = createMockLLM(llmResponse, 150)

      agent = new CodeQualityAgent(mockLLM, deps)

      const files: FileContent[] = [{ path: 'test.ts', content: 'function complex() { /* ... */ }' }]

      const result = await agent.analyze(files)

      expect(result.agentName).toBe('code-quality')
      expect(result.findings).toHaveLength(1)
      expect(result.findings[0].type).toBe('quality')
      expect(result.tokensUsed).toBe(150)
      expect(result.duration).toBeGreaterThan(0)
    })

    it('should call LLM with constructed prompt', async () => {
      mockLLM = createMockLLM(JSON.stringify([]), 50)
      agent = new CodeQualityAgent(mockLLM, deps)

      const files: FileContent[] = [{ path: 'a.ts', content: 'code' }]

      await agent.analyze(files)

      expect(mockLLM.chat).toHaveBeenCalledTimes(1)
      const callArgs = mockLLM.chat.mock.calls[0][0]
      expect(callArgs).toHaveLength(2)
      expect(callArgs[0].role).toBe('system')
      expect(callArgs[1].role).toBe('user')
    })
  })
})
