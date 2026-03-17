import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import Dashboard from '@/web/Dashboard.tsx'

describe('WebDashboard', () => {
  const mockReportData = {
    branch: 'main',
    generatedAt: '2024-01-15T10:30:00Z',
    summary: {
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
    },
    findings: [
      {
        type: 'security',
        severity: 'high',
        filePath: 'src/auth.js',
        message: 'Potential XSS vulnerability',
        suggestion: 'Use textContent instead of innerHTML',
      },
      {
        type: 'performance',
        severity: 'medium',
        filePath: 'src/db.js',
        message: 'N+1 query detected',
        suggestion: 'Use eager loading',
      },
    ],
  }

  it('should render dashboard title with branch name', () => {
    render(<Dashboard data={mockReportData} />)
    expect(screen.getByText(/Code Review Dashboard/i)).toBeInTheDocument()
    expect(screen.getByText(/main/i)).toBeInTheDocument()
  })

  it('should display total findings count', () => {
    render(<Dashboard data={mockReportData} />)
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText(/Total Findings/i)).toBeInTheDocument()
  })

  it('should display severity distribution', () => {
    render(<Dashboard data={mockReportData} />)
    expect(screen.getByText(/Severity Distribution/i)).toBeInTheDocument()
    // Use getAllByText for values that may appear multiple times (bar label + badge)
    expect(screen.getAllByText(/Critical/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/High/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Medium/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Low/i)).toBeInTheDocument()
    expect(screen.getByText(/Info/i)).toBeInTheDocument()
  })

  it('should display agent breakdown', () => {
    render(<Dashboard data={mockReportData} />)
    expect(screen.getByText(/Findings by Agent/i)).toBeInTheDocument()
    // Agents appear in both agent grid and detailed findings
    expect(screen.getAllByText(/security/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/performance/i).length).toBeGreaterThan(0)
  })

  it('should render findings list', () => {
    render(<Dashboard data={mockReportData} />)
    expect(screen.getByText(/Detailed Findings/i)).toBeInTheDocument()
    expect(screen.getByText(/Potential XSS vulnerability/i)).toBeInTheDocument()
    expect(screen.getByText(/N\+1 query detected/i)).toBeInTheDocument()
  })

  it('should handle empty state with no findings', () => {
    const emptyData = {
      branch: 'main',
      generatedAt: new Date().toISOString(),
      summary: {
        totalFindings: 0,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        byAgent: {},
      },
      findings: [],
    }
    render(<Dashboard data={emptyData} />)
    // Should show the empty state message
    expect(screen.getByText(/No findings/i)).toBeInTheDocument()
    // Branch should still be visible
    expect(screen.getByText(/main/i)).toBeInTheDocument()
  })
})
