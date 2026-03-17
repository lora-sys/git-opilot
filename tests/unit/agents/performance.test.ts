import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PerformanceAgent } from '@/agents/performance.js'
import { BaseAgent } from '@/agents/base.js'
import type { FileContent } from '@/agents/types.js'
import type { MemoryManager } from '@/beads/memory.js'
import type { BeadsExternalClient } from '@/beads/external-client.js'

// Mock LLM
const mockLLM = {
  chat: vi.fn().mockResolvedValue('[]'),
  countTokens: vi.fn().mockResolvedValue(150),
}

// Mock dependencies
const mockMemory = {
  searchFindings: vi.fn().mockResolvedValue([]),
  storeFinding: vi.fn().mockResolvedValue('id'),
}
const mockBeads = {
  createTask: vi.fn().mockResolvedValue('epic-123'),
  createSubTask: vi.fn().mockResolvedValue('task-123'),
  claimTask: vi.fn().mockResolvedValue(true),
  closeTask: vi.fn().mockResolvedValue(undefined),
}

// Test concrete implementation
class TestPerformanceAgent extends PerformanceAgent {
  constructor(llm: any, deps: any) {
    super(llm, deps)
  }
}

describe('PerformanceAgent', () => {
  let agent: PerformanceAgent
  let memory: MemoryManager
  let beads: BeadsExternalClient

  beforeEach(() => {
    vi.clearAllMocks()
    memory = mockMemory as any
    beads = mockBeads as any
    agent = new TestPerformanceAgent(mockLLM, {
      memory,
      beadsClient: beads,
      logger: console,
    })
  })

  describe('file filtering', () => {
    it('should include all source code files', () => {
      const files: FileContent[] = [
        { path: 'app.ts', content: 'code' },
        { path: 'server.js', content: 'code' },
        { path: 'utils.py', content: 'code' },
        { path: 'config.yaml', content: 'config' },
        { path: 'README.md', content: 'docs' },
      ]

      const result = agent.filterFiles(files)

      expect(result).toHaveLength(3)
      expect(result.find((f) => f.path === 'app.ts')).toBeDefined()
      expect(result.find((f) => f.path === 'server.js')).toBeDefined()
      expect(result.find((f) => f.path === 'utils.py')).toBeDefined()
      expect(result.find((f) => f.path === 'config.yaml')).toBeUndefined()
      expect(result.find((f) => f.path === 'README.md')).toBeUndefined()
    })

    it('should return empty array when no matching files', () => {
      const files: FileContent[] = [
        { path: 'README.md', content: 'docs' },
        { path: 'config.yaml', content: 'config' },
      ]

      const result = agent.filterFiles(files)

      expect(result).toHaveLength(0)
    })
  })

  describe('prompt building', () => {
    it('should include performance analysis topics', async () => {
      const files = [{ path: 'app.ts', content: 'code' }]

      const prompt = await agent.buildPrompt(files)

      const content = prompt[0].content as string
      expect(content).toContain('cyclomatic complexity')
      expect(content).toContain('algorithmic efficiency')
      expect(content).toContain('memory leaks')
      expect(content).toContain('N+1 queries')
      expect(content).toContain('race conditions')
      expect(content).toContain('blocking calls')
      expect(content).toContain('unnecessary re-renders')
      expect(content).toContain('bundle size')
      expect(content).toContain('performance')
    })

    it('should list files being analyzed', async () => {
      const files = [
        { path: 'app.ts', content: 'code' },
        { path: 'server.js', content: 'code' },
      ]

      const prompt = await agent.buildPrompt(files)

      const content = prompt[0].content as string
      expect(content).toContain('app.ts')
      expect(content).toContain('server.js')
    })

    it('should include context from memory if available', async () => {
      const files = [{ path: 'app.ts', content: 'code' }]
      const context = [{ content: 'Previous performance issue' }]

      const prompt = await agent.buildPrompt(files, context)

      const content = prompt[0].content as string
      expect(content).toContain('Previous findings from memory')
      expect(content).toContain('Previous performance issue')
    })

    it('should omit context section if none provided', async () => {
      const files = [{ path: 'app.ts', content: 'code' }]

      const prompt = await agent.buildPrompt(files)

      const content = prompt[0].content as string
      expect(content).not.toContain('Previous findings from memory')
    })

    it('should specify JSON output format', async () => {
      const files = [{ path: 'app.ts', content: 'code' }]

      const prompt = await agent.buildPrompt(files)

      const content = prompt[0].content as string
      expect(content).toMatch(/JSON array/)
      expect(content).toContain('type')
      expect(content).toContain('severity')
      expect(content).toContain('filePath')
      expect(content).toContain('lineRange')
      expect(content).toContain('message')
      expect(content).toContain('suggestion')
    })
  })

  describe('response parsing', () => {
    it('should parse valid JSON array of performance issues', () => {
      const content = JSON.stringify([
        {
          type: 'complexity',
          severity: 'high',
          filePath: 'app.ts',
          lineRange: { start: 10, end: 15 },
          message: 'Function has high cyclomatic complexity',
          suggestion: 'Break into smaller functions',
        },
      ])

      const findings = agent.parseResponse(content)

      expect(findings).toHaveLength(1)
      expect(findings[0].type).toBe('complexity')
      expect(findings[0].severity).toBe('high')
      expect(findings[0].filePath).toBe('app.ts')
      expect(findings[0].lineRange).toEqual({ start: 10, end: 15 })
      expect(findings[0].message).toBe('Function has high cyclomatic complexity')
      expect(findings[0].suggestion).toBe('Break into smaller functions')
    })

    it('should parse empty array', () => {
      const content = '[]'

      const findings = agent.parseResponse(content)

      expect(findings).toHaveLength(0)
    })

    it('should handle malformed JSON gracefully', () => {
      const content = 'invalid json'

      const findings = agent.parseResponse(content)

      expect(findings).toHaveLength(1)
      expect(findings[0].type).toBe('parse_error')
      expect(findings[0].severity).toBe('info')
      expect(findings[0].message).toContain('Failed to parse LLM response')
    })

    it('should convert null lineRange to undefined', () => {
      const content = JSON.stringify([
        {
          type: 'memory-leak',
          severity: 'critical',
          filePath: 'cache.js',
          lineRange: null,
          message: 'Unbounded cache growth',
        },
      ])

      const findings = agent.parseResponse(content)

      expect(findings[0].lineRange).toBeUndefined()
    })

    it('should handle missing optional fields', () => {
      const content = JSON.stringify([
        {
          type: 'n-plus-1',
          severity: 'medium',
          message: 'Potential N+1 query pattern',
        },
      ])

      const findings = agent.parseResponse(content)

      expect(findings[0].filePath).toBeUndefined()
      expect(findings[0].lineRange).toBeUndefined()
      expect(findings[0].suggestion).toBeUndefined()
    })
  })

  describe('analyze method', () => {
    it('should return proper AgentResult with findings', async () => {
      const files = [{ path: 'app.ts', content: 'code' }]
      const mockFindings = [{ type: 'complexity', severity: 'medium', message: 'High complexity' }]

      const testAgent = new (class extends PerformanceAgent {
        constructor(llm: any, deps: any) {
          super(llm, deps)
        }
        protected parseResponse(content: string): any[] {
          return mockFindings
        }
      })(mockLLM, { memory, beadsClient: beads, logger: console })

      const result = await testAgent.analyze(files)

      expect(result.agentName).toBe('performance')
      expect(result.findings).toEqual(mockFindings)
      expect(result.tokensUsed).toBe(150)
      expect(result.duration).toBeGreaterThan(0)
    })

    it('should call LLM with built prompt', async () => {
      const files = [{ path: 'app.ts', content: 'code' }]

      await agent.analyze(files)

      expect(mockLLM.chat).toHaveBeenCalledTimes(1)
      expect(mockLLM.chat).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          temperature: expect.any(Number),
          maxTokens: expect.any(Number),
        })
      )
    })
  })

  describe('Beads integration', () => {
    it('should create and claim Beads sub-task', async () => {
      const files = [{ path: 'app.ts', content: 'code' }]
      const agentWithBeads = new TestPerformanceAgent(mockLLM, {
        memory,
        beadsClient: beads,
        logger: console,
      })

      const analyzeSpy = vi.spyOn(agentWithBeads as any, 'analyze')
      analyzeSpy.mockResolvedValue({
        agentName: 'performance',
        findings: [],
        tokensUsed: 100,
        duration: 10,
      })

      await agentWithBeads.execute(files, { results: {} as any, beadsEpicId: 'epic-123' })

      expect(beads.createSubTask).toHaveBeenCalledWith('epic-123', expect.stringContaining('performance'))
      expect(beads.claimTask).toHaveBeenCalledWith(expect.any(String))
    })

    it('should close Beads task with summary', async () => {
      const files = [{ path: 'app.ts', content: 'code' }]
      const agentWithBeads = new TestPerformanceAgent(mockLLM, {
        memory,
        beadsClient: beads,
        logger: console,
      })

      const analyzeSpy = vi.spyOn(agentWithBeads as any, 'analyze')
      analyzeSpy.mockResolvedValue({
        agentName: 'performance',
        findings: [{ type: 'complexity', severity: 'high', message: 'test' }],
        tokensUsed: 100,
        duration: 10,
      })

      await agentWithBeads.execute(files, { results: {} as any, beadsEpicId: 'epic-123' })

      expect(beads.closeTask).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('1 findings'))
    })
  })

  describe('memory integration', () => {
    it('should store findings in memory', async () => {
      const files = [{ path: 'app.ts', content: 'code' }]
      const findings = [{ type: 'memory-leak', severity: 'critical', message: 'Unbounded cache' }]

      const agentWithMemory = new (class extends PerformanceAgent {
        constructor(llm: any, deps: any) {
          super(llm, deps)
        }
        protected parseResponse(content: string): any[] {
          return findings
        }
      })(mockLLM, { memory, beadsClient: beads, logger: console })

      await agentWithMemory.execute(files, {} as any)

      expect(memory.storeFinding).toHaveBeenCalledTimes(1)
      expect(memory.storeFinding).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'memory-leak',
          content: 'Unbounded cache',
          filePath: undefined,
          lineRange: undefined,
          priority: 10,
          agentSource: 'performance',
          tags: [],
        })
      )
    })
  })
})
