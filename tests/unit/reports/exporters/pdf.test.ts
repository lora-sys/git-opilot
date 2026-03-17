import { describe, it, expect, beforeEach } from 'vitest';
import { PdfExporter } from '@/reports/exporters/pdf.ts';
import type { Report } from '@/pocketflow/types';

describe('PdfExporter', () => {
  let exporter: PdfExporter;
  const mockReport: Report = {
    title: 'Test Report',
    generatedAt: new Date('2024-01-15T10:00:00Z'),
    format: 'markdown',
    sections: [
      {
        title: 'Executive Summary',
        content: 'This report contains **2** findings across 2 agents.',
      },
      {
        title: 'Detailed Findings',
        content: '### 1. security (high)\n**File**: src/index.js\n**Message**: XSS vulnerability',
      },
    ],
  };

  beforeEach(() => {
    exporter = new PdfExporter();
  });

  it('should export report to PDF buffer', async () => {
    const buffer = await exporter.export(mockReport);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('should produce a valid PDF file with %PDF header', async () => {
    const buffer = await exporter.export(mockReport);
    // PDF files start with '%PDF-'
    const header = buffer.slice(0, 5).toString('utf8');
    expect(header).toBe('%PDF-');
  });

  it('should generate non-empty document with reasonable size', async () => {
    const buffer = await exporter.export(mockReport);
    expect(buffer.length).toBeGreaterThan(1024);
  });
});
