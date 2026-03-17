import React from 'react'
import { Text } from 'ink'
import AgentStatus from './AgentStatus'
import { colors } from '../themes/default.js'

interface AgentStatusMap {
  [agentName: string]: {
    status: 'pending' | 'running' | 'completed' | 'error'
    progress: number
    findings: number
    error?: string
  }
}

interface ProgressDashboardProps {
  agentStatus: AgentStatusMap
  totalAgents: number
}

export default function ProgressDashboard({ agentStatus, totalAgents }: ProgressDashboardProps): React.ReactNode {
  // Calculate overall progress
  const totalProgress = Object.values(agentStatus).reduce((sum, status) => sum + status.progress, 0)
  const overallProgress = totalAgents > 0 ? Math.round(totalProgress / totalAgents) : 0

  // Count agents by status
  const statusCounts = {
    pending: 0,
    running: 0,
    completed: 0,
    error: 0,
  }
  Object.values(agentStatus).forEach((s) => {
    statusCounts[s.status]++
  })

  return (
    <Text>
      <Text color="white" bold>
        ╔════════════════════════════════════════╗
        {'\n'}║ Git Copilot - Code Review in Progress ║{'\n'}
        ╚════════════════════════════════════════╝
      </Text>
      {'\n'}
      {'\n'}
      <Text color="cyan" bold>
        Overall Progress: {overallProgress}%
      </Text>{' '}
      <Text color="gray">
        ({statusCounts.completed}/{totalAgents} agents completed)
      </Text>
      {'\n'}
      {/* Progress bar */}
      <Text>
        [{''}
        {Array.from({ length: 20 }).map((_, i) => {
          const filled = i < overallProgress / 5
          return (
            <Text key={i} color={filled ? colors.progressBar.filled : colors.progressBar.empty}>
              {filled ? '█' : '░'}
            </Text>
          )
        })}
        {''}]
      </Text>
      {'\n'}
      {'\n'}
      <Text color="white" bold>
        Agent Status:
      </Text>
      {'\n'}
      {Object.entries(agentStatus).map(([name, status]) => (
        <AgentStatus
          key={name}
          name={name}
          status={status.status}
          progress={status.progress}
          findings={status.findings}
          error={status.error}
        />
      ))}
      {'\n'}
      <Text color="gray">Press Ctrl+C to exit</Text>
    </Text>
  )
}
