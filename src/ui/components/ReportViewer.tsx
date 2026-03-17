import React from 'react'
import { Text } from 'ink'
import { colors } from '../themes/default.js'

interface ReportSection {
  id: string
  title: string
  content: string
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info'
}

interface ReportViewerProps {
  report: {
    title: string
    sections: ReportSection[]
  }
  maxContentLength?: number
}

export default function ReportViewer({ report, maxContentLength = 500 }: ReportViewerProps): React.ReactNode {
  // Truncate content if needed
  const truncate = (text: string): string => {
    if (text.length <= maxContentLength) return text
    return text.substring(0, maxContentLength) + '...'
  }

  // Simple markdown rendering (headings, lists, bold)
  const renderContent = (content: string): React.ReactNode => {
    const lines = truncate(content).split('\n')
    return lines.map((line, idx) => {
      // Heading (### or **)
      if (line.startsWith('### ')) {
        return (
          <Text key={idx}>
            <Text color="white" bold>
              {line.slice(4)}
            </Text>
            {'\n'}
          </Text>
        )
      }
      if (line.startsWith('## ')) {
        return (
          <Text key={idx}>
            <Text color="white" bold underline>
              {line.slice(3)}
            </Text>
            {'\n'}
          </Text>
        )
      }
      if (line.startsWith('# ')) {
        return (
          <Text key={idx}>
            <Text color="white" bold>
              {line.slice(2)}
            </Text>
            {'\n'}
          </Text>
        )
      }
      // List item
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <Text key={idx}>
            <Text color="yellow"> • </Text>
            {line.slice(2)}
            {'\n'}
          </Text>
        )
      }
      // Bold text
      const boldParts = line.split(/\*\*(.*?)\*\*/g)
      if (boldParts.length > 1) {
        return (
          <Text key={idx}>
            {boldParts.map((part, i) =>
              i % 2 === 1 ? (
                <Text key={i} color="white" bold>
                  {part}
                </Text>
              ) : (
                part
              )
            )}
            {'\n'}
          </Text>
        )
      }
      // Regular line
      return (
        <Text key={idx}>
          {line}
          {'\n'}
        </Text>
      )
    })
  }

  // Get severity color for section
  const getSeverityColor = (severity?: string): string => {
    switch (severity) {
      case 'critical':
      case 'high':
        return colors.critical
      case 'medium':
        return colors.medium
      case 'low':
        return colors.low
      default:
        return colors.info
    }
  }

  return (
    <Text>
      <Text color="white" bold>
        {' '}
        {report.title}{' '}
      </Text>
      {'\n'}
      {'='.repeat(report.title.length + 4)}
      {'\n'}
      {'\n'}

      {report.sections.map((section, idx) => (
        <React.Fragment key={idx}>
          <Text color="white" bold>
            {section.title}
          </Text>
          {'\n'}
          <Text color="gray">{'─'.repeat(section.title.length)}</Text>
          {'\n'}
          {section.severity && (
            <>
              <Text color={getSeverityColor(section.severity)}>Severity: {section.severity.toUpperCase()}</Text>
              {'\n'}
            </>
          )}
          {'\n'}
          {renderContent(section.content)}
          {'\n'}
          {'\n'}
        </React.Fragment>
      ))}

      <Text color="gray">--- End of Report ---</Text>
    </Text>
  )
}
