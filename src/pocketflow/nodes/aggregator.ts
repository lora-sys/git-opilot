import type { SharedStore } from '../types.js';
import type { AgentResult } from '../../agents/types.js';
import type { AggregatedFindings } from '../types.js';

export class AggregatorNode {
  async run(store: SharedStore): Promise<void> {
    const results = Array.from(store.results.values());

    const allFindings = results.flatMap(r => r.findings);
    // For now, simple mapping; later add deduplication
    const deduped = allFindings.map((f, idx) => ({
      ...f,
      agents: [results[idx]?.agentName || 'unknown'],
    }));

    const severityCount: Record<string, number> = {};
    const agentCount: Record<string, number> = {};
    let totalTokens = 0;

    results.forEach(r => {
      agentCount[r.agentName] = (agentCount[r.agentName] || 0) + 1;
      totalTokens += r.tokensUsed;
    });

    deduped.forEach((f: any) => {
      const sev = f.severity || 'info';
      severityCount[sev] = (severityCount[sev] || 0) + 1;
    });

    const aggregated: AggregatedFindings = {
      findings: deduped,
      summary: {
        totalFindings: deduped.length,
        bySeverity: severityCount,
        byAgent: agentCount,
        avgTokensUsed: results.length ? totalTokens / results.length : 0,
      },
    };

    store.aggregated = aggregated;
  }
}
