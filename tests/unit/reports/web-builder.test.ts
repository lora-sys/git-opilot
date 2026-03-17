import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildWebDashboard } from '@/reports/web-builder.js'
import { mkdtemp, rmdir, writeFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('WebBuilder', () => {
  let tempDir: string
  let bundlePath: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'git-copilot-web-'))
    bundlePath = join(tempDir, 'bundle.js')
    // Create a minimal fake bundle for testing
    await writeFile(bundlePath, 'console.log("Web dashboard loaded");')
  })

  afterEach(async () => {
    await unlink(bundlePath).catch(() => {})
    await rmdir(tempDir).catch(() => {})
  })

  it('should generate HTML with embedded data and bundle reference', () => {
    const branch = 'main'
    const aggregated = {
      summary: {
        totalFindings: 15,
        bySeverity: { critical: 2, high: 5, medium: 6, low: 2, info: 0 },
        byAgent: { security: 4, performance: 3, architecture: 2 },
      },
      findings: [],
    }

    const html = buildWebDashboard(branch, aggregated, { bundlePath })

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<div id="root"></div>')
    expect(html).toContain('<script>')
    expect(html).toContain('window.__REPORT_DATA__')
    expect(html).toContain(JSON.stringify(aggregated.summary.totalFindings))
    expect(html).toContain('bundle.js')
  })

  it('should escape HTML in branch names to prevent XSS', () => {
    const branch = '<script>alert("xss")</script>'
    const aggregated = { summary: { totalFindings: 0 }, findings: [] }

    const html = buildWebDashboard(branch, aggregated, { bundlePath })

    // Title should be escaped
    expect(html).toContain('Code Review Dashboard - &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    // JSON data should escape closing script tag to prevent breakout
    expect(html).toContain('"<script>alert(\\"xss\\")<\\/script>"')
  })

  it('should include meta viewport for responsive design', () => {
    const html = buildWebDashboard('main', { summary: { totalFindings: 0 }, findings: [] }, { bundlePath })

    expect(html).toContain('viewport')
    expect(html).toContain('width=device-width')
  })
})
