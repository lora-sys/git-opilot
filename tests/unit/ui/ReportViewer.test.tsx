import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from 'ink-testing-library'
import React from 'react'
import ReportViewer from '@/ui/components/ReportViewer.tsx'

describe('ReportViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render report title', () => {
    const report = {
      title: 'Code Review Report',
      sections: [],
    }

    const { lastFrame } = render(<ReportViewer report={report} />)

    expect(lastFrame()).toContain('Code Review Report')
  })

  it('should render executive summary section', () => {
    const report = {
      title: 'Report',
      sections: [
        {
          id: 'executive-summary',
          title: 'Executive Summary',
          content: 'This is the executive summary with key findings.',
        },
      ],
    }

    const { lastFrame } = render(<ReportViewer report={report} />)

    expect(lastFrame()).toContain('Executive Summary')
    expect(lastFrame()).toContain('This is the executive summary with key findings.')
  })

  it('should render findings by agent section', () => {
    const report = {
      title: 'Report',
      sections: [
        {
          id: 'findings',
          title: 'Findings by Agent',
          content: '- Security: 5 issues\n- Performance: 3 issues',
        },
      ],
    }

    const { lastFrame } = render(<ReportViewer report={report} />)

    expect(lastFrame()).toContain('Findings by Agent')
    expect(lastFrame()).toContain('Security: 5 issues')
    expect(lastFrame()).toContain('Performance: 3 issues')
  })

  it('should display severity with appropriate colors', () => {
    const report = {
      title: 'Report',
      sections: [
        {
          id: 'security',
          title: 'Security Review',
          content: '🔴 Critical: XSS vulnerability\n🟡 Medium: Missing CSP\n🟢 Low: Console.log in prod',
        },
      ],
    }

    const { lastFrame } = render(<ReportViewer report={report} />)

    expect(lastFrame()).toContain('Critical')
    expect(lastFrame()).toContain('XSS vulnerability')
    expect(lastFrame()).toContain('Medium')
    expect(lastFrame()).toContain('CSP')
  })

  it('should handle empty report', () => {
    const report = {
      title: 'Empty Report',
      sections: [],
    }

    const { lastFrame } = render(<ReportViewer report={report} />)

    expect(lastFrame()).toContain('Empty Report')
  })

  it('should truncate long content with ellipsis', () => {
    const longContent = 'A'.repeat(500)
    const report = {
      title: 'Report',
      sections: [
        {
          id: 'long',
          title: 'Long Section',
          content: longContent,
        },
      ],
    }

    const { lastFrame } = render(<ReportViewer report={report} maxContentLength={100} />)

    expect(lastFrame()).toContain('...')
  })

  it('should render markdown formatting', () => {
    const report = {
      title: 'Report',
      sections: [
        {
          id: 'md',
          title: 'Markdown Section',
          content: '# Heading\n- List item 1\n- List item 2\n**bold text**',
        },
      ],
    }

    const { lastFrame } = render(<ReportViewer report={report} />)

    expect(lastFrame()).toContain('Heading')
    expect(lastFrame()).toContain('List item 1')
    expect(lastFrame()).toContain('List item 2')
    expect(lastFrame()).toContain('bold text')
  })

  it('should handle sections with no content', () => {
    const report = {
      title: 'Report',
      sections: [
        {
          id: 'empty-section',
          title: 'Empty Section',
          content: '',
        },
      ],
    }

    const { lastFrame } = render(<ReportViewer report={report} />)

    expect(lastFrame()).toContain('Empty Section')
  })
})
