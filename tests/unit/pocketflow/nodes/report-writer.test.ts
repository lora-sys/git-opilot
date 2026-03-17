import { describe, it, expect, beforeEach } from 'vitest'
import { ReportWriterNode } from '@/pocketflow/nodes/report-writer.js'
import type { SharedStore } from '@/pocketflow/types.js'
import type { AgentResult } from '@/agents/types.js'
import type { GitRepository } from '@/git/types.js'

describe('ReportWriterNode', () => {
  let node: ReportWriterNode
  let store: SharedStore
  let mockRepo: GitRepository

  const createMockResult = (agentName: string, findings: any[]) => ({
    agentName,
    findings,
    tokensUsed: 100,
    duration: 50,
    success: true,
  })

  beforeEach(() => {
    node = new ReportWriterNode()
    mockRepo = {
      currentBranch: 'feature/test',
      rootDir: '/repo',
      recentCommits: [],
      changedFiles: [],
    } as GitRepository

    store = {
      repo: mockRepo,
      files: [],
      results: new Map(),
      agentsCompleted: 0,
      totalAgents: 1,
      startTime: new Date(),
      memoryManager: undefined,
      beadsClient: undefined,
      config: {},
      aggregated: {
        findings: [
          {
            type: 'security',
            severity: 'high',
            filePath: 'src/index.js',
            lineRange: { start: 10, end: 15 },
            message: 'Potential XSS vulnerability',
            agents: ['security'],
            suggestion: 'Escape user input',
          },
          {
            type: 'performance',
            severity: 'medium',
            filePath: 'src/util.js',
            message: 'N+1 query problem',
            agents: ['performance'],
          },
        ],
        summary: {
          totalFindings: 2,
          bySeverity: { high: 1, medium: 1 },
          byAgent: { security: 1, performance: 1 },
          avgTokensUsed: 100,
        },
      },
    }

    // Add a result to the map
    store.results.set('security', createMockResult('security', store.aggregated.findings.slice(0, 1)))
    store.results.set('performance', createMockResult('performance', store.aggregated.findings.slice(1, 2)))
  })

  it('should generate markdown report by default', async () => {
    const report = await node.run(store)

    expect(report.format).toBe('markdown')
    expect(report.title).toContain('feature/test')
    expect(report.sections).toHaveLength(3)

    // Executive Summary
    expect(report.sections[0].title).toBe('Executive Summary')
    expect(report.sections[0].content).toContain('**2** findings')
    expect(report.sections[0].content).toContain('high')
    expect(report.sections[0].content).toContain('medium')

    // Findings by Agent
    expect(report.sections[1].title).toBe('Findings by Agent')
    expect(report.sections[1].content).toContain('security')
    expect(report.sections[1].content).toContain('performance')

    // Detailed Findings
    expect(report.sections[2].title).toBe('Detailed Findings')
    expect(report.sections[2].content).toContain('### 1. security (high)')
    expect(report.sections[2].content).toContain('XSS')
    expect(report.sections[2].content).toContain('### 2. performance (medium)')
  })

  it('should generate HTML report when format is html', async () => {
    store.config = { output: { format: 'html' } }
    const report = await node.run(store)

    expect(report.format).toBe('html')
    // HTML report should be a single section with full interactive dashboard
    expect(report.sections).toHaveLength(1)
    const html = report.sections[0].content
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html')
    expect(html).toContain('<div id="root"></div>')
    expect(html).toContain('window.__REPORT_DATA__')
    expect(html).toContain('bundle.js')
    expect(html).toContain('</html>')
  })

  it('should embed report data in HTML for client-side rendering', async () => {
    store.config = { output: { format: 'html' } }
    const report = await node.run(store)

    const html = report.sections[0].content
    // Check that report data is embedded as JSON
    expect(html).toContain('"totalFindings":2')
    expect(html).toContain('"security":1')
    expect(html).toContain('"performance":1')
    // Branch name should be included
    expect(html).toContain('feature/test')
  })

  it('should use custom bundle path from config when provided', async () => {
    store.config = { output: { format: 'html', bundlePath: '/custom/path/dashboard.js' } }
    const report = await node.run(store)

    const html = report.sections[0].content
    expect(html).toContain('src="/custom/path/dashboard.js"')
  })

  it('should default to bundle.js if no bundle path specified', async () => {
    store.config = { output: { format: 'html' } }
    const report = await node.run(store)

    const html = report.sections[0].content
    expect(html).toContain('src="bundle.js"')
  })

  it('should handle empty findings gracefully', async () => {
    store.aggregated.findings = []
    store.aggregated.summary.totalFindings = 0
    store.aggregated.summary.bySeverity = {}
    store.aggregated.summary.byAgent = {}

    const report = await node.run(store)

    expect(report.sections[2].content).toContain('No findings detected')
  })
})
