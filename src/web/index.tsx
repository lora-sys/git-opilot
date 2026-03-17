import React from 'react';
import { createRoot } from 'react-dom/client';
import Dashboard from './Dashboard';

// Type declaration for the injected data
declare global {
  interface Window {
    __REPORT_DATA__?: {
      branch: string;
      generatedAt: string;
      summary: {
        totalFindings: number;
        bySeverity: Record<string, number>;
        byAgent: Record<string, number>;
      };
      findings: Array<{
        type: string;
        severity: string;
        filePath?: string;
        message: string;
        suggestion?: string;
      }>;
    };
  }
}

// Get the data injected by the HTML wrapper
const reportData = window.__REPORT_DATA__;

if (!reportData) {
  document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: No report data found.</div>';
  throw new Error('Report data not found');
}

// Render the dashboard
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <Dashboard data={reportData} />
    </React.StrictMode>
  );
} else {
  console.error('Root element not found');
}
