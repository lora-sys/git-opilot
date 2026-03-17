import React from 'react'
import { Text, Box } from 'ink'

interface DashboardProps {
  stats: {
    totalFindings: number
    bySeverity: Record<string, number>
    byAgent: Record<string, number>
    avgTokensUsed: number
  }
}

export default function Dashboard({ stats }: DashboardProps) {
  // Compute a simple health score: lower findings = higher score, max 100
  const maxFindings = 100 // baseline
  const healthScore = Math.max(0, 100 - Math.round((stats.totalFindings / maxFindings) * 100))

  const severityOrder = ['critical', 'high', 'medium', 'low', 'info']

  const hasNoFindings = stats.totalFindings === 0

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>
        Repository Health Dashboard
      </Text>
      {hasNoFindings ? (
        <>
          <Text>
            Total Findings:{' '}
            <Text bold color="yellow">
              0
            </Text>
          </Text>
          <Text color="yellow">No findings</Text>
        </>
      ) : (
        <>
          <Text>
            Total Findings:{' '}
            <Text bold color={healthScore > 80 ? 'green' : healthScore > 50 ? 'yellow' : 'red'}>
              {stats.totalFindings}
            </Text>
          </Text>
          <Text>
            Health Score: <Text bold>{healthScore}%</Text>
          </Text>
          <Text bold>Severity Distribution</Text>
          {severityOrder.map((sev) => (
            <Text key={sev}>
              {'  '}
              {sev.charAt(0).toUpperCase() + sev.slice(1)}: {stats.bySeverity[sev] || 0}
            </Text>
          ))}
          <Text bold>Findings by Agent</Text>
          {Object.entries(stats.byAgent).map(([agent, count]) => (
            <Text key={agent}>
              {'  '}
              {agent}: {count}
            </Text>
          ))}
          <Text>Avg Tokens/Agent: {Math.round(stats.avgTokensUsed)}</Text>
        </>
      )}
    </Box>
  )
}
