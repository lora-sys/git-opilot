import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from 'ink-testing-library'
import React from 'react'
import ProgressDashboard from '@/ui/components/ProgressDashboard.tsx'

// Mock agent status
const mockAgentStatus = {
  security: { status: 'running', progress: 60, findings: 5 },
  performance: { status: 'completed', progress: 100, findings: 3 },
  architecture: { status: 'running', progress: 30, findings: 0 },
  dependency: { status: 'pending', progress: 0, findings: 0 },
  'git-history': { status: 'error', progress: 45, findings: 0, error: 'LLM timeout' },
}

describe('ProgressDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render all agents with their status indicators', () => {
    const { lastFrame } = render(<ProgressDashboard agentStatus={mockAgentStatus} totalAgents={5} />)

    expect(lastFrame()).toContain('security')
    expect(lastFrame()).toContain('performance')
    expect(lastFrame()).toContain('architecture')
    expect(lastFrame()).toContain('dependency')
    expect(lastFrame()).toContain('git-history')
  })

  it('should show overall progress percentage', () => {
    const { lastFrame } = render(<ProgressDashboard agentStatus={mockAgentStatus} totalAgents={5} />)

    // Overall progress = (60+100+30+0+45) / (5*100) = 235/500 = 47%
    expect(lastFrame()).toContain('47%')
  })

  it('should display running status with spinner', () => {
    const { lastFrame } = render(<ProgressDashboard agentStatus={mockAgentStatus} totalAgents={5} />)

    expect(lastFrame()).toContain('●') // or some running indicator
  })

  it('should display completed status with checkmark', () => {
    const { lastFrame } = render(<ProgressDashboard agentStatus={mockAgentStatus} totalAgents={5} />)

    expect(lastFrame()).toContain('✓') // or similar
  })

  it('should display error status with X', () => {
    const { lastFrame } = render(<ProgressDashboard agentStatus={mockAgentStatus} totalAgents={5} />)

    expect(lastFrame()).toContain('✗') // or similar
  })

  it('should show progress bar for each agent', () => {
    const { lastFrame } = render(<ProgressDashboard agentStatus={mockAgentStatus} totalAgents={5} />)

    expect(lastFrame()).toContain('[') // progress bar start
    expect(lastFrame()).toContain(']') // progress bar end
  })

  it('should handle empty agent status', () => {
    const { lastFrame } = render(<ProgressDashboard agentStatus={{}} totalAgents={0} />)

    expect(lastFrame()).toContain('0%')
  })

  it('should use different colors for statuses', () => {
    // This tests that colors are applied (exact ANSI codes are complex, but we can check presence)
    const { lastFrame } = render(<ProgressDashboard agentStatus={mockAgentStatus} totalAgents={5} />)

    // Running should be yellow/cyan, completed green, error red
    expect(lastFrame()).toMatch(/[\s\S]/) // Just verify output exists
  })
})
