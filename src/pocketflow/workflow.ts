import type { BaseAgent } from '../agents/base'
import type { FileContent } from '../agents/types'
import type { GitRepository } from '../git/types'
import type { AgentResult } from '../agents/types'
import { MemoryManager } from '../beads/memory'
import { BeadsExternalClient } from '../beads/external-client'
import type { SharedStore, Report } from './types'
import { AgentParallelNode } from './nodes/async-parallel-batch'
import { AggregatorNode } from './nodes/aggregator'
import { ReportWriterNode } from './nodes/report-writer'

export class ReviewWorkflow {
  private agents: BaseAgent[]
  private config: any // Combined workflow and app config
  private memory: MemoryManager
  private beads: BeadsExternalClient | undefined
  private parallelNode: AgentParallelNode
  private aggregator: AggregatorNode
  private reportWriter: ReportWriterNode

  constructor(agents: BaseAgent[], config: any, memory: MemoryManager, beads?: BeadsExternalClient) {
    this.agents = agents
    this.config = config
    this.memory = memory
    this.beads = beads
    this.parallelNode = new AgentParallelNode(agents, config.maxConcurrent)
    this.aggregator = new AggregatorNode()
    this.reportWriter = new ReportWriterNode()
  }

  async run(files: FileContent[], repo: GitRepository): Promise<Report> {
    const store: SharedStore = {
      repo,
      files,
      results: new Map<string, AgentResult>(),
      agentsCompleted: 0,
      totalAgents: this.agents.length,
      startTime: new Date(),
      memoryManager: this.memory,
      config: this.config,
      ...(this.beads && { beadsClient: this.beads }),
    }

    // Create Beads epic if enabled
    if (this.beads) {
      store.beadsEpicId = await this.beads.createTask(
        `Code review: ${repo.currentBranch} at ${new Date().toISOString()}`
      )
    }

    // Execute parallel agents
    await this.parallelNode.run(store)

    // Aggregate results
    await this.aggregator.run(store)

    // Write report
    const report = await this.reportWriter.run(store)

    // Close Beads epic
    if (store.beadsEpicId && this.beads) {
      const summary = `Completed. Findings: ${store.aggregated?.summary.totalFindings || 0}`
      await this.beads.closeTask(store.beadsEpicId, summary)
    }

    return report
  }
}
