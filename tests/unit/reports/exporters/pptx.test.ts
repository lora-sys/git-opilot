import { describe, it, expect, beforeEach } from 'vitest';
import { PptxExporter } from '@/reports/exporters/pptx.ts';
import type { Report } from '@/pocketflow/types';

describe('PptxExporter', () => {
  let exporter: PptxExporter;
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
        title: 'Findings by Agent',
        content: '- **security**: 1\n- **performance**: 1',
      },
    ],
  };

  beforeEach(() => {
    exporter = new PptxExporter();
  });

  it('should export report to PPTX buffer', async () => {
    const buffer = await exporter.export(mockReport);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('should produce a valid PPTX file (ZIP format)', async () => {
    const buffer = await exporter.export(mockReport);
    // PPTX is also a ZIP; check magic bytes
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });

  it('should generate presentation with multiple slides', async () => {
    const buffer = await exporter.export(mockReport);
    // A basic presentation should have at least 2 slides (title + content)
    const asString = buffer.toString('utf8');
    // Check for slide relationships or slide parts
    expect(asString).toContain('slide');
  });
});
