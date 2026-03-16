import type { LLMAdapter } from '../llm/adapter.js';
import { MemoryManager } from '../beads/memory.js';
import { BeadsExternalClient } from '../beads/external-client.js';
import type {
  FileContent,
  AgentResult,
  AgentFinding,
  AgentDependencies,
  SharedStore,
  Logger,
} from './types.js';

// Helper: map severity to priority
function severityToPriority(severity: AgentFinding['severity']): number {
  const map: Record<AgentFinding['severity'], number> = {
    critical: 10,
    high: 9,
    medium: 6,
    low: 3,
    info: 1,
  };
  return map[severity] ?? 5;
}

// Helper: convert AgentFinding to MemoryManager Finding input
function convertToMemoryFinding(
  finding: AgentFinding,
  agentName: string,
  taskId?: string
): import('../beads/memory.js').Finding {
  return {
    type: finding.type as any,
    content: finding.message,
    filePath: finding.filePath,
    lineRange: finding.lineRange,
    priority: severityToPriority(finding.severity),
    agentSource: agentName,
    createdAt: new Date(),
    tags: [],
    relatedTaskId: taskId,
  };
}

export abstract class BaseAgent {
  readonly name: string;
  readonly type: string;
  protected config: any;
  protected llm: LLMAdapter;
  protected memory?: import('../beads/memory.js').MemoryManager;
  protected beadsClient?: BeadsExternalClient;
  protected logger: Logger;

  private taskId?: string; // Beads task ID for this agent run

  constructor(
    name: string,
    type: string,
    llm: LLMAdapter,
    config: any,
    deps: AgentDependencies
  ) {
    this.name = name;
    this.type = type;
    this.llm = llm;
    this.config = config;
    this.memory = deps.memory;
    this.beadsClient = deps.beadsClient;
    this.logger = deps.logger;
  }

  abstract analyze(files: FileContent[], context?: any): Promise<AgentResult>;

  protected abstract buildPrompt(
    files: FileContent[],
    context: any
  ): Promise<import('../llm/adapter.js').ChatMessage[]>;

  protected abstract parseResponse(content: string): AgentFinding[];

  protected async getContext(query: string): Promise<string> {
    if (!this.memory) return '';
    const findings = await this.memory.searchFindings(query, 5);
    return this.formatContext(findings);
  }

  protected formatContext(findings: any[]): string {
    return findings.map((f) => `- ${f.content}`).join('\n');
  }

  async execute(files: FileContent[], sharedStore: SharedStore): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      // 1. Claim task if beads enabled
      if (this.beadsClient && sharedStore.beadsEpicId) {
        this.taskId = await this.beadsClient.createSubTask(sharedStore.beadsEpicId, this.name);
        await this.beadsClient.claimTask(this.taskId);
        this.logger.info(`Claimed Beads task ${this.taskId}`);
      }

      // 2. Get context from memory (if memory available)
      const context = await this.getContext(this.name);

      // 3-5. Call analyze (which uses buildPrompt, LLM, parseResponse)
      const result = await this.analyze(files, context);

      // 6. Store findings to memory if available
      if (this.memory && result.findings) {
        for (const finding of result.findings) {
          const memoryFinding = convertToMemoryFinding(finding, this.name, this.taskId);
          await this.memory.storeFinding(memoryFinding);
        }
      }

      // 7. Close Beads task if we created one
      if (this.taskId && this.beadsClient) {
        const summary = `Completed: ${result.findings.length} findings, ${result.tokensUsed} tokens`;
        await this.beadsClient.closeTask(this.taskId, summary);
        this.logger.info(`Closed Beads task ${this.taskId}`);
      }

      const duration = Date.now() - startTime;
      return { ...result, duration };
    } catch (error: any) {
      this.logger.error(`Agent ${this.name} failed: ${error.message}`);

      // Close task with failure reason if task exists
      if (this.taskId && this.beadsClient) {
        try {
          await this.beadsClient.closeTask(this.taskId, `Failed: ${error.message}`);
        } catch (closeError) {
          this.logger.error(`Failed to close Beads task: ${closeError.message}`);
        }
      }

      throw error;
    }
  }
}
