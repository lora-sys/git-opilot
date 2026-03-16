import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SecurityAgent } from '@/agents/security.js'
import { BaseAgent } from '@/agents/base.js'
import type { FileContent } from '@/agents/types.js'
import type { MemoryManager } from '@/beads/memory.js'
import type { BeadsExternalClient } from '@/beads/external-client.js'

// Mock LLM
const mockLLM = {
  chat: vi.fn().mockResolvedValue({ content: '[]', tokensUsed: 100 }),
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

// Mock agent for testing (concrete implementation)
class TestSecurityAgent extends SecurityAgent {
  constructor(llm: any, deps: any) {
    super(llm, deps)
  }
}

describe('SecurityAgent', () => {
  let agent: SecurityAgent
  let memory: MemoryManager
  let beads: BeadsExternalClient

  beforeEach(() => {
    vi.clearAllMocks()
    memory = mockMemory as any
    beads = mockBeads as any
    agent = new TestSecurityAgent(mockLLM, {
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
        { path: 'test.test.ts', content: 'test' },
      ]

      const result = agent.filterFiles(files)

      // Should include .ts, .js, .py files (test files are also source files)
      expect(result).toHaveLength(4)
      expect(result.find((f) => f.path === 'app.ts')).toBeDefined()
      expect(result.find((f) => f.path === 'server.js')).toBeDefined()
      expect(result.find((f) => f.path === 'utils.py')).toBeDefined()
      expect(result.find((f) => f.path === 'test.test.ts')).toBeDefined() // test files included
      // Non-source files excluded
      expect(result.find((f) => f.path === 'config.yaml')).toBeUndefined()
      expect(result.find((f) => f.path === 'README.md')).toBeUndefined()
    })

    it('should include test files for security testing', () => {
      const files: FileContent[] = [
        { path: 'component.test.tsx', content: 'test' },
        { path: 'api.spec.js', content: 'test' },
        { path: 'unit.test.py', content: 'test' },
      ]

      const result = agent.filterFiles(files)

      expect(result).toHaveLength(3)
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
    it('should include OWASP Top 10 categories', async () => {
      const files = [{ path: 'app.ts', content: 'code' }]

      const prompt = await agent.buildPrompt(files)

      const content = prompt[0].content as string
      expect(content).toContain('XSS')
      expect(content).toContain('SQL injection')
      expect(content).toContain('CSRF')
      expect(content).toContain('injection')
      expect(content).toContain('secrets')
      expect(content).toContain('authentication')
      expect(content).toContain('authorization')
      expect(content).toContain('OWASP')
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
      const context = [{ content: 'Context' }] // format expected by formatContext

      const prompt = await agent.buildPrompt(files, context)

      const content = prompt[0].content as string
      expect(content).toContain('Previous findings from memory')
      expect(content).toContain('Context')
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
    it('should parse valid JSON array of vulnerabilities', () => {
      const content = JSON.stringify([
        {
          type: 'xss',
          severity: 'high',
          filePath: 'app.ts',
          lineRange: { start: 10, end: 15 },
          message: 'Potential XSS vulnerability',
          suggestion: 'Use textContent instead of innerHTML',
        },
      ])

      const findings = agent.parseResponse(content)

      expect(findings).toHaveLength(1)
      expect(findings[0].type).toBe('xss')
      expect(findings[0].severity).toBe('high')
      expect(findings[0].filePath).toBe('app.ts')
      expect(findings[0].lineRange).toEqual({ start: 10, end: 15 })
      expect(findings[0].message).toBe('Potential XSS vulnerability')
      expect(findings[0].suggestion).toBe('Use textContent instead of innerHTML')
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
          type: 'sql-injection',
          severity: 'critical',
          filePath: 'db.js',
          lineRange: null,
          message: 'Unsafe query',
        },
      ])

      const findings = agent.parseResponse(content)

      expect(findings[0].lineRange).toBeUndefined()
    })

    it('should handle missing optional fields', () => {
      const content = JSON.stringify([
        {
          type: 'hardcoded-secret',
          severity: 'high',
          message: 'API key found in code',
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
      const mockFindings = [{ type: 'xss', severity: 'high', message: 'XSS risk' }]

      // Override parseResponse to return mock findings
      const testAgent = new (class extends SecurityAgent {
        constructor(llm: any, deps: any) {
          super(llm, deps)
        }
        protected parseResponse(content: string): any[] {
          return mockFindings
        }
      })(mockLLM, { memory, beadsClient: beads, logger: console })

      const result = await testAgent.analyze(files)

      expect(result.agentName).toBe('security')
      expect(result.findings).toEqual(mockFindings)
      expect(result.tokensUsed).toBe(100)
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
      const agentWithBeads = new TestSecurityAgent(mockLLM, {
        memory,
        beadsClient: beads,
        logger: console,
      })

      // Override analyze to avoid complexity
      const analyzeSpy = vi.spyOn(agentWithBeads as any, 'analyze')
      analyzeSpy.mockResolvedValue({
        agentName: 'security',
        findings: [],
        tokensUsed: 50,
        duration: 10,
      })

      await agentWithBeads.execute(files, { results: {} as any, beadsEpicId: 'epic-123' })

      expect(beads.createSubTask).toHaveBeenCalledWith('epic-123', expect.stringContaining('security'))
      expect(beads.claimTask).toHaveBeenCalledWith(expect.any(String))
    })

    it('should close Beads task with summary', async () => {
      const files = [{ path: 'app.ts', content: 'code' }]
      const agentWithBeads = new TestSecurityAgent(mockLLM, {
        memory,
        beadsClient: beads,
        logger: console,
      })

      const analyzeSpy = vi.spyOn(agentWithBeads as any, 'analyze')
      analyzeSpy.mockResolvedValue({
        agentName: 'security',
        findings: [{ type: 'xss', severity: 'high', message: 'test' }],
        tokensUsed: 50,
        duration: 10,
      })

      await agentWithBeads.execute(files, { results: {} as any, beadsEpicId: 'epic-123' })

      expect(beads.closeTask).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('1 findings'))
    })
  })

  describe('memory integration', () => {
    it('should store findings in memory', async () => {
      const files = [{ path: 'app.ts', content: 'code' }]
      const findings = [{ type: 'sql-injection', severity: 'critical', message: 'Unsafe query' }]

      const agentWithMemory = new (class extends SecurityAgent {
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
          type: 'sql-injection',
          content: 'Unsafe query',
          filePath: undefined,
          lineRange: undefined,
          priority: 10, // critical severity maps to priority 10
          agentSource: 'security',
          tags: [],
        })
      )
    })
  })
})
