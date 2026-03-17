import { describe, it, expect, beforeEach } from 'vitest';
import { DocxExporter } from '@/reports/exporters/docx.ts';
import type { Report } from '@/pocketflow/types';

describe('DocxExporter', () => {
  let exporter: DocxExporter;
  const mockReport: Report = {
    title: 'Test Report',
    generatedAt: new Date('2024-01-15T10:00:00Z'),
    format: 'markdown',
    sections: [
      {
        title: 'Executive Summary',
        content: 'This report contains **2** findings across 2 agents.\n\nSeverity distribution:\n- **high**: 1\n- **medium**: 1',
      },
      {
        title: 'Findings by Agent',
        content: '- **security**: 1\n- **performance**: 1',
      },
      {
        title: 'Detailed Findings',
        content: '### 1. security (high)\n**File**: src/index.js\n**Message**: XSS vulnerability\n**Suggestion**: Escape user input\n\n### 2. performance (medium)\n**File**: src/util.js\n**Message**: N+1 query',
      },
    ],
  };

  beforeEach(() => {
    exporter = new DocxExporter();
  });

  it('should export report to DOCX buffer', async () => {
    const buffer = await exporter.export(mockReport);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('should produce a valid DOCX file (ZIP format with PK magic)', async () => {
    const buffer = await exporter.export(mockReport);
    // DOCX files are ZIP archives; check magic bytes: PK\x03\x04 or just PK at start
    expect(buffer[0]).toBe(0x50); // 'P'
    expect(buffer[1]).toBe(0x4b); // 'K'
  });

  it('should generate non-empty document with expected size', async () => {
    const buffer = await exporter.export(mockReport);
    // Basic sanity: file should be at least 1KB
    expect(buffer.length).toBeGreaterThan(1024);
  });
});
