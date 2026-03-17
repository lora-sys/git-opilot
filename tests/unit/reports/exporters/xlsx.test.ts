import { describe, it, expect, beforeEach } from 'vitest'
import { XlsxExporter } from '@/reports/exporters/xlsx.ts'
import type { Report } from '@/pocketflow/types'

describe('XlsxExporter', () => {
  let exporter: XlsxExporter
  const mockReport: Report = {
    title: 'Test Report',
    generatedAt: new Date('2024-01-15T10:00:00Z'),
    format: 'markdown',
    sections: [
      {
        title: 'Executive Summary',
        content:
          'This report contains **2** findings across 2 agents.\n\nSeverity distribution:\n- **high**: 1\n- **medium**: 1',
      },
      {
        title: 'Findings by Agent',
        content: '- **security**: 1\n- **performance**: 1',
      },
      {
        title: 'Detailed Findings',
        content:
          '### 1. security (high)\n**File**: src/index.js\n**Message**: XSS vulnerability\n**Suggestion**: Escape user input\n\n### 2. performance (medium)\n**File**: src/util.js\n**Message**: N+1 query',
      },
    ],
  }

  beforeEach(() => {
    exporter = new XlsxExporter()
  })

  it('should export report to XLSX buffer', async () => {
    const buffer = await exporter.export(mockReport)
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('should produce a valid XLSX file (ZIP format)', async () => {
    const buffer = await exporter.export(mockReport)
    // XLSX is also ZIP; check magic bytes
    expect(buffer[0]).toBe(0x50)
    expect(buffer[1]).toBe(0x4b)
  })

  it('should generate workbook with reasonable size', async () => {
    const buffer = await exporter.export(mockReport)
    expect(buffer.length).toBeGreaterThan(1024)
  })
})
