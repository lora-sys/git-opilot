import type { MemoryManager } from '../beads/memory.js'
import type { BeadsExternalClient } from '../beads/external-client.js'

export interface FileContent {
  path: string
  content: string
  language?: string
}

export interface AgentFinding {
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  filePath?: string
  lineRange?: { start: number; end: number }
  message: string
  suggestion?: string
  codeExample?: string
}

export interface AgentResult {
  agentName: string
  findings: AgentFinding[]
  tokensUsed: number
  duration: number
  error?: string
}

export type AgentType =
  | 'security'
  | 'performance'
  | 'quality'
  | 'architecture'
  | 'dependency'
  | 'git-history'
  | 'aggregator'
  | 'report-writer'

export interface AgentConfig {
  // Placeholder for future config options
  [key: string]: any
}

export interface Logger {
  debug: (...args: any[]) => void
  info: (...args: any[]) => void
  warn: (...args: any[]) => void
  error: (...args: any[]) => void
}

export interface AgentDependencies {
  memory?: MemoryManager
  beadsClient?: BeadsExternalClient
  logger: Logger
}

export interface SharedStore {
  beadsEpicId?: string
  memoryManager?: MemoryManager
  beadsClient?: BeadsExternalClient
  results: Record<string, AgentResult>
  // Additional fields will be added in M3
  [key: string]: any
}
