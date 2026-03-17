import type { SharedStore } from '../types.js'
import type { Report, ReportSection } from '../types.js'
import { buildWebDashboard } from '@/reports/web-builder.js'

export class ReportWriterNode {
  async run(store: SharedStore): Promise<Report> {
    const aggregated = store.aggregated
    if (!aggregated) {
      throw new Error('Aggregated data is missing. Aggregator node must run before ReportWriterNode.')
    }
    const config = store.config || {}
    const format = (config.output?.format || 'markdown') as Report['format']
    const now = new Date()

    let sections: ReportSection[]

    if (format === 'html') {
      // Use web-builder to generate interactive dashboard
      const bundlePath = config.output?.bundlePath || 'bundle.js'
      const html = buildWebDashboard(store.repo.currentBranch, aggregated, { bundlePath })
      sections = [
        {
          title: 'Interactive Dashboard',
          content: html,
        },
      ]
    } else {
      // Markdown / terminal format
      const total = aggregated.summary.totalFindings
      const agentCount = store.results.size
      const severityList = this.formatDict(aggregated.summary.bySeverity)
      const agentList = this.formatDict(aggregated.summary.byAgent) || 'No findings'
      const findingsList =
        aggregated.findings.length > 0 ? this.formatFindings(aggregated.findings) : 'No findings detected.'

      sections = [
        {
          title: 'Executive Summary',
          content: `This report contains **${total}** findings across ${agentCount} agents.\n\nSeverity distribution:\n${severityList}`,
        },
        {
          title: 'Findings by Agent',
          content: agentList,
        },
        {
          title: 'Detailed Findings',
          content: findingsList,
        },
      ]
    }

    const report: Report = {
      title: `Code Review Report - ${store.repo.currentBranch}`,
      generatedAt: now,
      format,
      sections,
    }

    store.report = report
    return report
  }

  private formatDict(dict: Record<string, number>): string {
    return Object.entries(dict)
      .map(([k, v]) => `- **${k}**: ${v}`)
      .join('\n')
  }

  private formatFindings(findings: any[]): string {
    return findings
      .map(
        (f, i) =>
          `### ${i + 1}. ${f.type} (${f.severity})\n**File**: ${f.filePath || 'unknown'}\n**Message**: ${f.message}\n${f.suggestion ? `**Suggestion**: ${f.suggestion}\n` : ''}`
      )
      .join('\n\n')
  }
}
