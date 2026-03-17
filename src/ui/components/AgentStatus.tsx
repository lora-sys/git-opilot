import React from 'react'
import { Text } from 'ink'
import { colors } from '../themes/default.js'

interface AgentStatusProps {
  name: string
  status: 'pending' | 'running' | 'completed' | 'error'
  progress: number
  findings: number
  error?: string | undefined
}

export default function AgentStatus({ name, status, progress, findings, error }: AgentStatusProps): React.ReactNode {
  const statusIcons: Record<string, string> = {
    pending: '○',
    running: '●',
    completed: '✓',
    error: '✗',
  }

  const statusColors: Record<string, string> = {
    pending: colors.pending,
    running: colors.running,
    completed: colors.completed,
    error: colors.error,
  }

  const agentColors: Record<string, string> = {
    security: colors.security,
    performance: colors.performance,
    architecture: colors.architecture,
    dependency: colors.dependency,
    'git-history': colors.gitHistory,
    'code-quality': colors.codeQuality,
  }

  const agentColor = agentColors[name] ?? 'white'

  return (
    <Text>
      <Text color={statusColors[status]}>{statusIcons[status]}</Text> <Text color={agentColor}>{name}</Text>{' '}
      <Text color={statusColors[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text> {progress}% (
      {findings} findings)
      {error && (
        <>
          {' '}
          <Text color="red">Error: {error}</Text>
        </>
      )}
      {'\n'}
    </Text>
  )
}
