export interface BuildWebDashboardOptions {
  bundlePath: string;
}

/**
 * Generates a standalone HTML file that loads an embedded React dashboard.
 *
 * The HTML includes:
 * - A root div for React mounting
 * - An inline script with report data (window.__REPORT_DATA__)
 * - A reference to the pre-built bundle.js file (script tag)
 *
 * @param branch - Git branch name (escaped for HTML)
 * @param aggregated - Aggregated review data (summary, findings)
 * @param options - Configuration including bundlePath (used as script src)
 * @returns Complete HTML string
 */
export function buildWebDashboard(
  branch: string,
  aggregated: any,
  options: BuildWebDashboardOptions
): string {
  // Simple HTML escaping for branch name
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Prepare report data for client-side consumption
  // We only include serializable data (avoid Date objects, functions, etc.)
  const reportData = {
    branch: aggregated.branch || branch,
    generatedAt: new Date().toISOString(),
    summary: aggregated.summary,
    findings: aggregated.findings || [],
  };

  // Serialize to JSON and escape for safe embedding in HTML
  let json = JSON.stringify(reportData);
  // Escape closing script tags to prevent XSS (breakout attack)
  json = json.replace(/<\/script>/gi, '<\\/script>');
  // Also escape HTML comment openings to prevent IE comment parsing issues
  json = json.replace(/<!--/g, '<\\/\\/<'); // not strictly necessary but safe

  // Use the provided bundle path as script src
  const scriptSrc = options.bundlePath;

  // Generate HTML with embedded data and bundle reference
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code Review Dashboard - ${escapeHtml(branch)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    #root { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    window.__REPORT_DATA__ = ${json};
  </script>
  <script src="${scriptSrc}"></script>
</body>
</html>`;

  return html;
}
