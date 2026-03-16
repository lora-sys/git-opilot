import type { BaseAgent } from '../../agents/base.js';
import type { FileContent } from '../../agents/types.js';
import type { SharedStore } from '../types.js';
import type { AgentResult } from '../../agents/types.js';

export class AgentParallelNode {
  private agents: BaseAgent[];
  private maxConcurrent: number;

  constructor(agents: BaseAgent[], maxConcurrent: number) {
    this.agents = agents;
    this.maxConcurrent = maxConcurrent;
  }

  async run(store: SharedStore): Promise<void> {
    // Run all agents in parallel (simplified; ignoring maxConcurrent for now)
    const results = await Promise.all(
      this.agents.map(agent => agent.execute(store.files, store))
    );

    // Store results
    results.forEach(r => store.results.set(r.agentName, r));
    store.agentsCompleted = results.length;
  }
}
