import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseAgent } from '@/agents/base.js';
import type { LLMAdapter } from '@/llm/adapter.js';
import type { FileContent, AgentResult, AgentFinding, AgentDependencies, SharedStore } from '@/agents/types.js';

// Mock concrete agent for testing
class TestAgent extends BaseAgent {
  private mockAnalyzeResult: AgentResult;

  constructor(
    llm: LLMAdapter,
    deps: AgentDependencies,
    mockAnalyzeResult: AgentResult
  ) {
    super('test-agent', 'quality', llm, {}, deps);
    this.mockAnalyzeResult = mockAnalyzeResult;
  }

  async analyze(files: FileContent[], context?: any): Promise<AgentResult> {
    return this.mockAnalyzeResult;
  }

  protected buildPrompt(files: FileContent[], context: any): Promise<any[]> {
    return Promise.resolve([{ role: 'user', content: 'test' }]);
  }

  protected parseResponse(content: string): AgentFinding[] {
    return [];
  }
}

describe('BaseAgent', () => {
  let mockLLM: LLMAdapter;
  let mockMemory: { searchFindings: vi.Fn; storeFinding: vi.Fn };
  let mockBeadsClient: { createSubTask: vi.Fn; claimTask: vi.Fn; closeTask: vi.Fn };
  let mockLogger: { info: vi.Fn; error: vi.Fn };
  let deps: AgentDependencies;
  let sharedStore: SharedStore;

  beforeEach(() => {
    mockLLM = {
      chat: vi.fn().mockResolvedValue({ content: 'LLM response', tokensUsed: 100 }),
    } as any;

    mockMemory = {
      searchFindings: vi.fn().mockResolvedValue([]),
      storeFinding: vi.fn().mockResolvedValue('finding-id-123'),
    };

    mockBeadsClient = {
      createSubTask: vi.fn().mockResolvedValue('task-123'),
      claimTask: vi.fn().mockResolvedValue(true),
      closeTask: vi.fn().mockResolvedValue(undefined),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    };

    deps = {
      memory: mockMemory as any,
      beadsClient: mockBeadsClient as any,
      logger: mockLogger,
    };

    sharedStore = {
      beadsEpicId: 'epic-123',
      memoryManager: mockMemory as any,
      beadsClient: mockBeadsClient as any,
      results: {},
    };
  });

  describe('execute', () => {
    it('should create and claim a Beads sub-task when beadsClient and epicId are available', async () => {
      const agent = new TestAgent(mockLLM, deps, {
        agentName: 'test-agent',
        findings: [],
        tokensUsed: 50,
        duration: 100,
      });

      await agent.execute([], sharedStore);

      expect(mockBeadsClient.createSubTask).toHaveBeenCalledWith('epic-123', 'test-agent');
      expect(mockBeadsClient.claimTask).toHaveBeenCalledWith('task-123');
    });

    it('should close the Beads task after analysis completes', async () => {
      const agent = new TestAgent(mockLLM, deps, {
        agentName: 'test-agent',
        findings: [{ type: 'quality', severity: 'medium', message: 'Test finding' }],
        tokensUsed: 50,
        duration: 100,
      });

      await agent.execute([], sharedStore);

      expect(mockBeadsClient.closeTask).toHaveBeenCalledWith('task-123', expect.any(String));
    });

    it('should get context from memory when available', async () => {
      mockMemory.searchFindings.mockResolvedValue([
        { content: 'Finding 1' } as any,
        { content: 'Finding 2' } as any,
      ]);

      const agent = new TestAgent(mockLLM, deps, {
        agentName: 'test-agent',
        findings: [],
        tokensUsed: 50,
        duration: 100,
      });

      // Override getContext to actually call memory
      agent['getContext'] = async (query: string) => {
        const findings = await (agent['memory'] as any).searchFindings(query, 5);
        return findings.map((f: any) => `- ${f.content}`).join('\n');
      };

      await agent.execute([], sharedStore);

      expect(mockMemory.searchFindings).toHaveBeenCalledWith(expect.any(String), 5);
    });

    it('should store findings to memory when memoryManager is available', async () => {
      const findings: AgentFinding[] = [
        { type: 'quality', severity: 'high', message: 'Test finding', filePath: 'test.ts', lineRange: { start: 1, end: 5 } },
      ];

      const agent = new TestAgent(mockLLM, deps, {
        agentName: 'test-agent',
        findings,
        tokensUsed: 50,
        duration: 100,
      });

      await agent.execute([], sharedStore);

      expect(mockMemory.storeFinding).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'quality',
          priority: 9, // high maps to 9? We'll need to define mapping, but for now check call
          content: 'Test finding',
          filePath: 'test.ts',
          lineRange: { start: 1, end: 5 },
          agentSource: 'test-agent',
        })
      );
    });

    it('should handle missing beadsClient gracefully', async () => {
      const agent = new TestAgent(mockLLM, { ...deps, beadsClient: undefined }, {
        agentName: 'test-agent',
        findings: [],
        tokensUsed: 50,
        duration: 100,
      });

      await agent.execute([], sharedStore);

      expect(mockBeadsClient.createSubTask).not.toHaveBeenCalled();
    });

    it('should handle missing memory gracefully', async () => {
      const agent = new TestAgent(mockLLM, { ...deps, memory: undefined }, {
        agentName: 'test-agent',
        findings: [],
        tokensUsed: 50,
        duration: 100,
      });

      await agent.execute([], sharedStore);

      expect(mockMemory.searchFindings).not.toHaveBeenCalled();
    });
  });

  describe('getContext', () => {
    it('should return empty string when memory is not available', async () => {
      const agent = new TestAgent(mockLLM, { ...deps, memory: undefined }, {
        agentName: 'test-agent',
        findings: [],
        tokensUsed: 50,
        duration: 100,
      });

      const context = await agent['getContext']('test query');
      expect(context).toBe('');
    });

    it('should format findings into a string', async () => {
      const agent = new TestAgent(mockLLM, deps, {
        agentName: 'test-agent',
        findings: [],
        tokensUsed: 50,
        duration: 100,
      });

      mockMemory.searchFindings.mockResolvedValue([
        { content: 'Finding A' } as any,
        { content: 'Finding B' } as any,
      ]);

      const context = await agent['getContext']('query');

      expect(context).toBe('- Finding A\n- Finding B');
    });
  });
});
