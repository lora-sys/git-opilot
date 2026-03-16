import type { GitRepository } from '../git/types.js';
import type { FileContent } from '../agents/types.js';
import type { MemoryManager } from '../beads/memory.js';
import type { BeadsExternalClient } from '../beads/external-client.js';
import type { AgentResult } from '../agents/types.js';

export interface SharedStore {
  // Repository metadata
  repo: GitRepository;
  files: FileContent[];
  diffs?: any[]; // FileChange type - to be defined

  // Beads integration
  beadsEpicId?: string;
  memoryManager?: MemoryManager;
  beadsClient?: BeadsExternalClient;

  // Agent results (agentName -> result)
  results: Map<string, AgentResult>;

  // Progress tracking
  agentsCompleted: number;
  totalAgents: number;
  startTime: Date;

  // Aggregation and report
  aggregated?: AggregatedFindings;
  report?: Report;

  // Config and other dynamic data
  [key: string]: any;
}

export interface WorkflowConfig {
  maxConcurrent: number;
  timeoutPerAgent: number; // ms
  skipAgents?: string[];
}

export interface AggregatedFindings {
  findings: AggregatedFinding[];
  summary: {
    totalFindings: number;
    bySeverity: Record<string, number>;
    byAgent: Record<string, number>;
    avgTokensUsed: number;
  };
}

export interface AggregatedFinding {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  filePath?: string;
  lineRange?: { start: number; end: number };
  message: string;
  agents: string[]; // which agents reported similar findings
  suggestion?: string;
  codeExample?: string;
}

export interface Report {
  title: string;
  generatedAt: Date;
  format: 'terminal' | 'markdown' | 'html' | 'docx' | 'pdf' | 'pptx' | 'xlsx';
  sections: ReportSection[];
}

export interface ReportSection {
  title: string;
  content: string; // markdown or structured data
  findings?: AggregatedFinding[];
}
