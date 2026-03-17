import type { BaseAgent } from '../../agents/base'
import type { SharedStore } from '../types'
import type { AgentResult } from '../../agents/types'

export class AgentParallelNode {
  private agents: BaseAgent[]
  private maxConcurrent: number

  constructor(agents: BaseAgent[], maxConcurrent: number) {
    this.agents = agents
    this.maxConcurrent = maxConcurrent
  }

  async run(store: SharedStore): Promise<void> {
    const results: AgentResult[] = []

    // Process agents in batches to respect maxConcurrent
    for (let i = 0; i < this.agents.length; i += this.maxConcurrent) {
      const batch = this.agents.slice(i, i + this.maxConcurrent)
      const batchResults = await Promise.all(
        batch.map(agent => agent.execute(store.files, store as any))
      )
      results.push(...batchResults)
    }

    // Store results
    results.forEach(r => store.results.set(r.agentName, r))
    store.agentsCompleted = results.length
  }
}
