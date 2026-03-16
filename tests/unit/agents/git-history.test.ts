import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GitHistoryAgent } from '@/agents/git-history.js'
import { BaseAgent } from '@/agents/base.js'
import type { FileContent } from '@/agents/types.js'
import type { MemoryManager } from '@/beads/memory.js'
import type { BeadsExternalClient } from '@/beads/external-client.js'

// Mock LLM
const mockLLM = {
  chat: vi.fn().mockResolvedValue({ content: '[]', tokensUsed: 180 }),
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
class TestGitHistoryAgent extends GitHistoryAgent {
  constructor(llm: any, deps: any) {
    super(llm, deps)
  }
}

describe('GitHistoryAgent', () => {
  let agent: GitHistoryAgent
  let memory: MemoryManager
  let beads: BeadsExternalClient

  beforeEach(() => {
    vi.clearAllMocks()
    memory = mockMemory as any
    beads = mockBeads as any
    agent = new TestGitHistoryAgent(mockLLM, {
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
    it('should include git history analysis topics', async () => {
      const files = [{ path: 'app.ts', content: 'code' }]

      const prompt = await agent.buildPrompt(files)

      const content = prompt[0].content as string
      expect(content).toContain('commit hygiene')
      expect(content).toContain('secrets in history')
      expect(content).toContain('large files')
      expect(content).toContain('merge commits')
      expect(content).toContain('revert patterns')
      expect(content).toContain('commit message quality')
      expect(content).toContain('author attribution')
      expect(content).toContain('frequency analysis')
      expect(content).toContain('git history')
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
      const context = [{ content: 'Previous git issue' }]

      const prompt = await agent.buildPrompt(files, context)

      const content = prompt[0].content as string
      expect(content).toContain('Previous findings from memory')
      expect(content).toContain('Previous git issue')
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
    it('should parse valid JSON array of git history issues', () => {
      const content = JSON.stringify([
        {
          type: 'secret',
          severity: 'critical',
          filePath: 'app.ts',
          lineRange: { start: 5, end: 10 },
          message: 'API key found in commit history',
          suggestion: 'Use BFG to remove secret and rotate key',
        },
      ])

      const findings = agent.parseResponse(content)

      expect(findings).toHaveLength(1)
      expect(findings[0].type).toBe('secret')
      expect(findings[0].severity).toBe('critical')
      expect(findings[0].filePath).toBe('app.ts')
      expect(findings[0].lineRange).toEqual({ start: 5, end: 10 })
      expect(findings[0].message).toBe('API key found in commit history')
      expect(findings[0].suggestion).toBe('Use BFG to remove secret and rotate key')
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
          type: 'large-file',
          severity: 'medium',
          filePath: 'assets/big.png',
          lineRange: null,
          message: 'Binary file in repository history',
        },
      ])

      const findings = agent.parseResponse(content)

      expect(findings[0].lineRange).toBeUndefined()
    })

    it('should handle missing optional fields', () => {
      const content = JSON.stringify([
        {
          type: 'poor-commit-message',
          severity: 'low',
          message: 'Commit message "fix" is too vague',
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
      const mockFindings = [{ type: 'merge-commit', severity: 'low', message: 'Unnecessary merge commit' }]

      const testAgent = new (class extends GitHistoryAgent {
        constructor(llm: any, deps: any) {
          super(llm, deps)
        }
        protected parseResponse(content: string): any[] {
          return mockFindings
        }
      })(mockLLM, { memory, beadsClient: beads, logger: console })

      const result = await testAgent.analyze(files)

      expect(result.agentName).toBe('git-history')
      expect(result.findings).toEqual(mockFindings)
      expect(result.tokensUsed).toBe(180)
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
      const agentWithBeads = new TestGitHistoryAgent(mockLLM, {
        memory,
        beadsClient: beads,
        logger: console,
      })

      const analyzeSpy = vi.spyOn(agentWithBeads as any, 'analyze')
      analyzeSpy.mockResolvedValue({
        agentName: 'git-history',
        findings: [],
        tokensUsed: 100,
        duration: 10,
      })

      await agentWithBeads.execute(files, { results: {} as any, beadsEpicId: 'epic-123' })

      expect(beads.createSubTask).toHaveBeenCalledWith('epic-123', expect.stringContaining('git-history'))
      expect(beads.claimTask).toHaveBeenCalledWith(expect.any(String))
    })

    it('should close Beads task with summary', async () => {
      const files = [{ path: 'app.ts', content: 'code' }]
      const agentWithBeads = new TestGitHistoryAgent(mockLLM, {
        memory,
        beadsClient: beads,
        logger: console,
      })

      const analyzeSpy = vi.spyOn(agentWithBeads as any, 'analyze')
      analyzeSpy.mockResolvedValue({
        agentName: 'git-history',
        findings: [{ type: 'secret', severity: 'critical', message: 'test' }],
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
      const findings = [{ type: 'squash-opportunity', severity: 'low', message: 'Multiple small commits' }]

      const agentWithMemory = new (class extends GitHistoryAgent {
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
          type: 'squash-opportunity',
          content: 'Multiple small commits',
          filePath: undefined,
          lineRange: undefined,
          priority: 3, // low severity maps to priority 3
          agentSource: 'git-history',
          tags: [],
        })
      )
    })
  })
})
