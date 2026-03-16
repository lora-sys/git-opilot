import type { SharedStore } from '../types.js';
import type { Report, ReportSection } from '../types.js';

export class ReportWriterNode {
  async run(store: SharedStore): Promise<Report> {
    const aggregated = store.aggregated;
    const config = store.config || {};
    const now = new Date();
    const format = (config.output?.format || 'markdown') as Report['format'];

    const sections: ReportSection[] = [
      {
        title: 'Executive Summary',
        content: `This report contains **${aggregated.summary.totalFindings}** findings across ${store.results.size} agents.\n\nSeverity distribution:\n${this.formatDict(aggregated.summary.bySeverity)}`,
      },
      {
        title: 'Findings by Agent',
        content: this.formatDict(aggregated.summary.byAgent) || 'No findings',
      },
      {
        title: 'Detailed Findings',
        content: aggregated.findings.length > 0 ? this.formatFindings(aggregated.findings) : 'No findings detected.',
      },
    ];

    const report: Report = {
      title: `Code Review Report - ${store.repo.currentBranch}`,
      generatedAt: now,
      format,
      sections,
    };

    store.report = report;
    return report;
  }

  private formatDict(dict: Record<string, number>): string {
    return Object.entries(dict)
      .map(([k, v]) => `- **${k}**: ${v}`)
      .join('\n');
  }

  private formatFindings(findings: any[]): string {
    return findings
      .map(
        (f, i) => `### ${i + 1}. ${f.type} (${f.severity})\n**File**: ${f.filePath || 'unknown'}\n**Message**: ${f.message}\n${f.suggestion ? `**Suggestion**: ${f.suggestion}\n` : ''}`
      )
      .join('\n\n');
  }
}
