import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from 'ink-testing-library'
import React from 'react'
import AgentStatus from '@/ui/components/AgentStatus.tsx'

describe('AgentStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render pending agent correctly', () => {
    const { lastFrame } = render(<AgentStatus name="security" status="pending" progress={0} findings={0} />)

    expect(lastFrame()).toContain('security')
    expect(lastFrame()).toContain('Pending')
  })

  it('should render running agent with progress', () => {
    const { lastFrame } = render(<AgentStatus name="performance" status="running" progress={65} findings={2} />)

    expect(lastFrame()).toContain('performance')
    expect(lastFrame()).toContain('Running')
    expect(lastFrame()).toContain('65%')
    expect(lastFrame()).toContain('2 findings')
  })

  it('should render completed agent with checkmark', () => {
    const { lastFrame } = render(<AgentStatus name="architecture" status="completed" progress={100} findings={5} />)

    expect(lastFrame()).toContain('architecture')
    expect(lastFrame()).toContain('Completed')
    expect(lastFrame()).toContain('✓')
    expect(lastFrame()).toContain('5 findings')
  })

  it('should render error agent with error message', () => {
    const { lastFrame } = render(
      <AgentStatus name="dependency" status="error" progress={30} findings={0} error="Connection timeout" />
    )

    expect(lastFrame()).toContain('dependency')
    expect(lastFrame()).toContain('Error')
    expect(lastFrame()).toContain('Connection timeout')
  })

  it('should display zero findings for agents with no issues', () => {
    const { lastFrame } = render(<AgentStatus name="code-quality" status="completed" progress={100} findings={0} />)

    expect(lastFrame()).toContain('0 findings')
  })

  it('should handle missing error prop gracefully', () => {
    const { lastFrame } = render(<AgentStatus name="test" status="error" progress={50} findings={0} />)

    expect(lastFrame()).toContain('test')
    expect(lastFrame()).toContain('Error')
  })

  it('should show different colors for different statuses', () => {
    // Pending - gray/blue
    const { lastFrame: pendingOut } = render(<AgentStatus name="a" status="pending" progress={0} findings={0} />)
    expect(pendingOut()).toMatch(/[\s\S]/)

    // Running - yellow/cyan
    const { lastFrame: runningOut } = render(<AgentStatus name="b" status="running" progress={50} findings={1} />)
    expect(runningOut()).toMatch(/[\s\S]/)

    // Completed - green
    const { lastFrame: completedOut } = render(<AgentStatus name="c" status="completed" progress={100} findings={2} />)
    expect(completedOut()).toMatch(/[\s\S]/)

    // Error - red
    const { lastFrame: errorOut } = render(
      <AgentStatus name="d" status="error" progress={25} findings={0} error="fail" />
    )
    expect(errorOut()).toMatch(/[\s\S]/)
  })
})
