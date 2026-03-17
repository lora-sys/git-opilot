import { describe, it, expect } from 'vitest'
import { render } from 'ink-testing-library'
import React from 'react'
import Dashboard from '@/ui/components/Dashboard.tsx'

describe('Dashboard', () => {
  const mockStats = {
    totalFindings: 15,
    bySeverity: {
      critical: 2,
      high: 5,
      medium: 6,
      low: 2,
      info: 0,
    },
    byAgent: {
      security: 4,
      performance: 3,
      architecture: 2,
      'code-quality': 4,
      dependency: 2,
      'git-history': 0,
    },
    avgTokensUsed: 1250,
  }

  it('should display overall findings count', () => {
    const { lastFrame } = render(<Dashboard stats={mockStats} />)
    const output = lastFrame()
    expect(output).toContain('15')
    expect(output).toContain('Total Findings')
  })

  it('should display severity distribution', () => {
    const { lastFrame } = render(<Dashboard stats={mockStats} />)
    const output = lastFrame()
    expect(output).toContain('Severity Distribution')
    expect(output).toContain('Critical')
    expect(output).toContain('High')
    expect(output).toContain('Medium')
  })

  it('should display agent breakdown', () => {
    const { lastFrame } = render(<Dashboard stats={mockStats} />)
    const output = lastFrame()
    expect(output).toContain('Findings by Agent')
    expect(output).toContain('security')
    expect(output).toContain('performance')
  })

  it('should show health score based on findings', () => {
    // More tests could check for health score calculation
    const { lastFrame } = render(<Dashboard stats={mockStats} />)
    const output = lastFrame()
    // Expect some health indicator
    expect(output).toMatch(/[0-9]+%/) // some percentage
  })

  it('handles empty stats gracefully', () => {
    const emptyStats = {
      totalFindings: 0,
      bySeverity: {},
      byAgent: {},
      avgTokensUsed: 0,
    }
    const { lastFrame } = render(<Dashboard stats={emptyStats} />)
    const output = lastFrame()
    expect(output).toContain('0')
    expect(output).toContain('No findings')
  })
})
