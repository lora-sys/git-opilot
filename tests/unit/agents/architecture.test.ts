import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ArchitectureAgent } from '@/agents/architecture.js'
import { BaseAgent } from '@/agents/base.js'
import type { FileContent } from '@/agents/types.js'
import type { MemoryManager } from '@/beads/memory.js'
import type { BeadsExternalClient } from '@/beads/external-client.js'

// Mock LLM
const mockLLM = {
  chat: vi.fn().mockResolvedValue({ content: '[]', tokensUsed: 120 }),
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
class TestArchitectureAgent extends ArchitectureAgent {
  constructor(llm: any, deps: any) {
    super(llm, deps)
  }
}

describe('ArchitectureAgent', () => {
  let agent: ArchitectureAgent
  let memory: MemoryManager
  let beads: BeadsExternalClient

  beforeEach(() => {
    vi.clearAllMocks()
    memory = mockMemory as any
    beads = mockBeads as any
    agent = new TestArchitectureAgent(mockLLM, {
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
      expect(result.find(f => f.path === 'app.ts')).toBeDefined()
      expect(result.find(f => f.path === 'server.js')).toBeDefined()
      expect(result.find(f => f.path === 'utils.py')).toBeDefined()
      expect(result.find(f => f.path === 'config.yaml')).toBeUndefined()
      expect(result.find(f => f.path === 'README.md')).toBeUndefined()
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
    it('should include architecture analysis topics', async () => {
      const files = [{ path: 'app.ts', content: 'code' }]

      const prompt = await agent.buildPrompt(files)

      const content = prompt[0].content as string
      expect(content).toContain('coupling')
      expect(content).toContain('cohesion')
      expect(content).toContain('SOLID')
      expect(content).toContain('design patterns')
      expect(content).toContain('modularity')
      expect(content).toContain('dependency direction')
      expect(content).toContain('layering')
      expect(content).toContain('testability')
      expect(content).toContain('architecture')
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
      const context = [{ content: 'Previous architecture concern' }]

      const prompt = await agent.buildPrompt(files, context)

      const content = prompt[0].content as string
      expect(content).toContain('Previous findings from memory')
      expect(content).toContain('Previous architecture concern')
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
    it('should parse valid JSON array of architecture issues', () => {
      const content = JSON.stringify([
        {
          type: 'coupling',
          severity: 'high',
          filePath: 'app.ts',
          lineRange: { start: 10, end: 15 },
          message: 'High coupling between modules',
          suggestion: 'Introduce interfaces to decouple',
        },
      ])

      const findings = agent.parseResponse(content)

      expect(findings).toHaveLength(1)
      expect(findings[0].type).toBe('coupling')
      expect(findings[0].severity).toBe('high')
      expect(findings[0].filePath).toBe('app.ts')
      expect(findings[0].lineRange).toEqual({ start: 10, end: 15 })
      expect(findings[0].message).toBe('High coupling between modules')
      expect(findings[0].suggestion).toBe('Introduce interfaces to decouple')
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
          type: 'god-class',
          severity: 'medium',
          filePath: 'utils.ts',
          lineRange: null,
          message: 'Class has too many responsibilities',
        },
      ])

      const findings = agent.parseResponse(content)

      expect(findings[0].lineRange).toBeUndefined()
    })

    it('should handle missing optional fields', () => {
      const content = JSON.stringify([
        {
          type: 'circular-dependency',
          severity: 'low',
          message: 'Circular import detected',
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
      const mockFindings = [
        { type: 'solid-violation', severity: 'high', message: 'Single Responsibility violated' },
      ]

      const testAgent = new (class extends ArchitectureAgent {
        constructor(llm: any, deps: any) {
          super(llm, deps)
        }
        protected parseResponse(content: string): any[] {
          return mockFindings
        }
      })(mockLLM, { memory, beadsClient: beads, logger: console })

      const result = await testAgent.analyze(files)

      expect(result.agentName).toBe('architecture')
      expect(result.findings).toEqual(mockFindings)
      expect(result.tokensUsed).toBe(120)
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
      const agentWithBeads = new TestArchitectureAgent(mockLLM, {
        memory,
        beadsClient: beads,
        logger: console,
      })

      const analyzeSpy = vi.spyOn(agentWithBeads as any, 'analyze')
      analyzeSpy.mockResolvedValue({
        agentName: 'architecture',
        findings: [],
        tokensUsed: 100,
        duration: 10,
      })

      await agentWithBeads.execute(files, { results: {} as any, beadsEpicId: 'epic-123' })

      expect(beads.createSubTask).toHaveBeenCalledWith(
        'epic-123',
        expect.stringContaining('architecture')
      )
      expect(beads.claimTask).toHaveBeenCalledWith(expect.any(String))
    })

    it('should close Beads task with summary', async () => {
      const files = [{ path: 'app.ts', content: 'code' }]
      const agentWithBeads = new TestArchitectureAgent(mockLLM, {
        memory,
        beadsClient: beads,
        logger: console,
      })

      const analyzeSpy = vi.spyOn(agentWithBeads as any, 'analyze')
      analyzeSpy.mockResolvedValue({
        agentName: 'architecture',
        findings: [{ type: 'coupling', severity: 'medium', message: 'test' }],
        tokensUsed: 100,
        duration: 10,
      })

      await agentWithBeads.execute(files, { results: {} as any, beadsEpicId: 'epic-123' })

      expect(beads.closeTask).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('1 findings')
      )
    })
  })

  describe('memory integration', () => {
    it('should store findings in memory', async () => {
      const files = [{ path: 'app.ts', content: 'code' }]
      const findings = [{ type: 'architectural-smell', severity: 'low', message: 'Consider separating concerns' }]

      const agentWithMemory = new (class extends ArchitectureAgent {
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
          type: 'architectural-smell',
          content: 'Consider separating concerns',
          filePath: undefined,
          lineRange: undefined,
          priority: 3, // low severity -> priority 3
          agentSource: 'architecture',
          tags: [],
        })
      )
    })
  })
})
