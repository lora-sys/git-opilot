import type { SharedStore } from '../types.js';
import type { Report, ReportSection } from '../types.js';

export class ReportWriterNode {
  async run(store: SharedStore): Promise<Report> {
    const aggregated = store.aggregated;
    const config = store.config || {};
    const format = (config.output?.format || 'markdown') as Report['format'];
    const now = new Date();

    let sections: ReportSection[];

    if (format === 'html') {
      sections = this.renderHtml(store.repo.currentBranch, aggregated);
    } else {
      // Markdown / terminal format
      const total = aggregated.summary.totalFindings;
      const agentCount = store.results.size;
      const severityList = this.formatDict(aggregated.summary.bySeverity);
      const agentList = this.formatDict(aggregated.summary.byAgent) || 'No findings';
      const findingsList = aggregated.findings.length > 0
        ? this.formatFindings(aggregated.findings)
        : 'No findings detected.';

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
      ];
    }

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

  private renderHtml(branch: string, aggregated: any): ReportSection[] {
    const escapeHtml = (text: string): string => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const renderSummary = (summary: any): string => {
      const total = summary.totalFindings;
      const agentCount = summary.byAgent ? Object.keys(summary.byAgent).length : 0;
      const severityList = Object.entries(summary.bySeverity || {})
        .map(([k, v]) => `<li><strong>${escapeHtml(k)}</strong>: ${v}</li>`)
        .join('\n');
      const agentList = Object.entries(summary.byAgent || {})
        .map(([k, v]) => `<li><strong>${escapeHtml(k)}</strong>: ${v}</li>`)
        .join('\n');

      return `<p>This report contains <strong>${total}</strong> findings across ${agentCount} agents.</p>
<h3>Severity distribution:</h3>
<ul>${severityList}</ul>
<h3>Findings by Agent:</h3>
<ul>${agentList}</ul>`;
    };

    const renderFindings = (findings: any[]): string => {
      if (findings.length === 0) {
        return '<p>No findings detected.</p>';
      }
      return `<div class="findings">\n${findings
        .map(
          (f, i) => `
      <div class="finding" data-severity="${f.severity}">
        <h3 class="severity ${f.severity}">${i + 1}. ${f.type} - ${f.severity.toUpperCase()}</h3>
        <p><strong>File:</strong> ${escapeHtml(f.filePath || 'unknown')}</p>
        <p><strong>Message:</strong> ${escapeHtml(f.message)}</p>${f.suggestion ? `<p><strong>Suggestion:</strong> ${escapeHtml(f.suggestion)}</p>` : ''}${f.codeExample ? `<pre><code>${escapeHtml(f.codeExample)}</code></pre>` : ''}
      </div>`
        )
        .join('\n')}\n</div>`;
    };

    const body = `<h1>Code Review Report</h1>
<p class="meta">Branch: ${escapeHtml(branch)} | Generated: ${new Date().toLocaleString()}</p>
<h2>Executive Summary</h2>
<div class="section">${renderSummary(aggregated.summary)}</div>
<h2>Findings by Agent</h2>
<div class="section">${renderSummary(aggregated.summary)}</div>
<h2>Detailed Findings</h2>
<div class="section">${renderFindings(aggregated.findings)}</div>`;

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Code Review Report - ${escapeHtml(branch)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; color: #333; }
    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    h2 { color: #2980b9; margin-top: 30px; }
    h3 { color: #16a085; }
    .findings { margin-left: 20px; }
    .severity { font-weight: bold; }
    .severity.critical { color: #e74c3c; }
    .severity.high { color: #e67e22; }
    .severity.medium { color: #f1c40f; }
    .severity.low { color: #2ecc71; }
    .severity.info { color: #3498db; }
    .meta { color: #7f8c8d; font-size: 0.9em; }
    pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
${body}
</body>
</html>`;

    return [
      {
        title: 'HTML Report',
        content: fullHtml,
      },
    ];
  }
}
