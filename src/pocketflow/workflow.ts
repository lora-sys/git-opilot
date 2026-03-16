import type { BaseAgent } from '../../agents/base.js'
import type { FileContent } from '../../agents/types.js'
import type { GitRepository } from '../../git/types.js'
import { MemoryManager } from '../../beads/memory.js'
import { BeadsExternalClient } from '../../beads/external-client.js'
import type { WorkflowConfig, SharedStore, Report } from '../types.js'
import { AgentParallelNode } from './nodes/async-parallel-batch.js'
import { AggregatorNode } from './nodes/aggregator.js'
import { ReportWriterNode } from './nodes/report-writer.js'

export class ReviewWorkflow {
  private agents: BaseAgent[]
  private config: any // Combined workflow and app config
  private memory: MemoryManager
  private beads?: BeadsExternalClient
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
      results: new Map(),
      agentsCompleted: 0,
      totalAgents: this.agents.length,
      startTime: new Date(),
      memoryManager: this.memory,
      beadsClient: this.beads,
      config: this.config,
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
