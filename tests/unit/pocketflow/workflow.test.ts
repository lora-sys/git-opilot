import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReviewWorkflow } from '@/pocketflow/workflow.js'
import { BaseAgent } from '@/agents/base.js'
import type { FileContent } from '@/agents/types.js'
import type { GitRepository } from '@/git/types.js'
import type { MemoryManager } from '@/beads/memory.js'
import type { BeadsExternalClient } from '@/beads/external-client.js'

// Mock agent
class MockAgent extends BaseAgent {
  constructor(
    name: string,
    llm: any,
    deps: any,
    private mockFindings: any[] = []
  ) {
    super(name, 'quality', llm, {}, deps)
  }

  async analyze(files: FileContent[], context?: any): Promise<any> {
    const messages = await this.buildPrompt(files, context)
    const response = await this.llm.chat(messages)
    const findings = this.parseResponse(response.content)
    return {
      agentName: this.name,
      findings,
      tokensUsed: response.tokensUsed,
      duration: 0,
    }
  }

  protected buildPrompt(files: FileContent[], context: any): Promise<any[]> {
    return Promise.resolve([{ role: 'user', content: 'mock' }])
  }

  protected parseResponse(content: string): any[] {
    return this.mockFindings
  }
}

// Mock LLM
const mockLLM = {
  chat: vi.fn().mockResolvedValue({ content: '[]', tokensUsed: 50 }),
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

describe('ReviewWorkflow', () => {
  let agents: BaseAgent[]
  let config: any
  let memory: MemoryManager
  let beads: BeadsExternalClient
  let repo: GitRepository
  let files: FileContent[]

  beforeEach(() => {
    vi.clearAllMocks()
    agents = [
      new MockAgent('agent1', mockLLM, { memory: mockMemory as any, beadsClient: mockBeads as any, logger: console }, [
        { type: 'quality', severity: 'medium', message: 'Finding 1' },
      ]),
      new MockAgent('agent2', mockLLM, { memory: mockMemory as any, beadsClient: mockBeads as any, logger: console }, [
        { type: 'quality', severity: 'high', message: 'Finding 2' },
      ]),
    ]
    config = { maxConcurrent: 2, timeoutPerAgent: 30000 }
    memory = mockMemory as any
    beads = mockBeads as any
    repo = {
      root: '/repo',
      currentBranch: 'main',
      remoteBranches: [],
      commits: [],
      tags: [],
      status: { staged: [], unstaged: [], untracked: [] },
    }
    files = [{ path: 'test.ts', content: 'code' }]
  })

  it('should be constructible with agents, config, memory, and optional beads', () => {
    const workflow = new ReviewWorkflow(agents, config, memory, beads)
    expect(workflow).toBeInstanceOf(ReviewWorkflow)
  })

  it('should run workflow and return a report', async () => {
    const workflow = new ReviewWorkflow(agents, config, memory, beads)
    const report = await workflow.run(files, repo)

    expect(report).toBeDefined()
    expect(report.title).toContain('Code Review Report')
    expect(report.generatedAt).toBeInstanceOf(Date)
    expect(report.sections).toBeDefined()
    expect(Array.isArray(report.sections)).toBe(true)
  })

  it('should create Beads epic when beads client provided', async () => {
    const workflow = new ReviewWorkflow(agents, config, memory, beads)
    await workflow.run(files, repo)

    expect(mockBeads.createTask).toHaveBeenCalledWith(expect.stringContaining('Code review:'))
  })

  it('should execute all agents and store results', async () => {
    const workflow = new ReviewWorkflow(agents, config, memory, beads)
    await workflow.run(files, repo)

    // Each agent should have been called (via parallel node)
    // Since agents use mock LLM, we can check that LLM was called for each agent
    expect(mockLLM.chat).toHaveBeenCalledTimes(2)
  })

  it('should store findings in memory for each agent', async () => {
    const workflow = new ReviewWorkflow(agents, config, memory, beads)
    await workflow.run(files, repo)

    // Each agent produced 1 finding, so 2 store calls
    expect(memory.storeFinding).toHaveBeenCalledTimes(2)
  })
})
