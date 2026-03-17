import React from 'react'

interface DashboardProps {
  data: {
    branch: string
    generatedAt: string
    summary: {
      totalFindings: number
      bySeverity: Record<string, number>
      byAgent: Record<string, number>
    }
    findings: Array<{
      type: string
      severity: string
      filePath?: string
      message: string
      suggestion?: string
    }>
  }
}

export default function Dashboard({ data }: DashboardProps) {
  const { branch, generatedAt, summary, findings } = data

  // Calculate health score (same as terminal dashboard)
  const maxFindings = 100
  const healthScore = Math.max(0, 100 - Math.round((summary.totalFindings / maxFindings) * 100))

  // Determine health color
  const getHealthColor = () => {
    if (healthScore > 80) return '#2ecc71' // green
    if (healthScore > 50) return '#f39c12' // yellow
    return '#e74c3c' // red
  }

  const severityOrder = ['critical', 'high', 'medium', 'low', 'info']

  const hasNoFindings = summary.totalFindings === 0

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Code Review Dashboard</h1>
        <p style={styles.branch}>Branch: {branch}</p>
        <p style={styles.meta}>Generated: {new Date(generatedAt).toLocaleString()}</p>
      </header>

      {hasNoFindings ? (
        <section style={styles.section}>
          <div style={{ textAlign: 'center', padding: '40px', color: '#f39c12' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>No findings</div>
            <div style={{ color: '#7f8c8d' }}>This repository has no code review issues.</div>
          </div>
        </section>
      ) : (
        <>
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Summary</h2>
            <div style={styles.summaryGrid}>
              <div style={styles.card}>
                <div style={{ ...styles.cardValue, color: getHealthColor() }}>{healthScore}%</div>
                <div style={styles.cardLabel}>Health Score</div>
              </div>
              <div style={styles.card}>
                <div style={styles.cardValue}>{summary.totalFindings}</div>
                <div style={styles.cardLabel}>Total Findings</div>
              </div>
            </div>
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Severity Distribution</h2>
            <div style={styles.severityGrid}>
              {severityOrder.map((sev) => {
                const count = summary.bySeverity[sev] || 0
                const percentage = summary.totalFindings > 0 ? (count / summary.totalFindings) * 100 : 0
                return (
                  <div key={sev} style={styles.severityBar}>
                    <div style={styles.severityLabel}>
                      <span style={{ textTransform: 'capitalize' }}>{sev}</span>
                      <span>{count}</span>
                    </div>
                    <div style={styles.barContainer}>
                      <div
                        style={{
                          ...styles.barFill,
                          width: `${percentage}%`,
                          backgroundColor:
                            sev === 'critical'
                              ? '#e74c3c'
                              : sev === 'high'
                                ? '#e67e22'
                                : sev === 'medium'
                                  ? '#f1c40f'
                                  : sev === 'low'
                                    ? '#2ecc71'
                                    : '#3498db',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Findings by Agent</h2>
            <div style={styles.agentGrid}>
              {Object.entries(summary.byAgent).map(([agent, count]) => (
                <div key={agent} style={styles.agentCard}>
                  <div style={styles.agentName}>{agent}</div>
                  <div style={styles.agentCount}>{count}</div>
                </div>
              ))}
            </div>
          </section>

          {findings.length > 0 && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Detailed Findings</h2>
              <div style={styles.findingsList}>
                {findings.map((finding, idx) => (
                  <div
                    key={idx}
                    style={{
                      ...styles.findingCard,
                      borderLeftColor:
                        finding.severity === 'critical'
                          ? '#e74c3c'
                          : finding.severity === 'high'
                            ? '#e67e22'
                            : finding.severity === 'medium'
                              ? '#f1c40f'
                              : finding.severity === 'low'
                                ? '#2ecc71'
                                : '#3498db',
                    }}
                  >
                    <div style={styles.findingHeader}>
                      <span style={{ fontWeight: 'bold' }}>{finding.type}</span>
                      <span
                        style={{
                          textTransform: 'capitalize',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor:
                            finding.severity === 'critical'
                              ? '#e74c3c'
                              : finding.severity === 'high'
                                ? '#e67e22'
                                : finding.severity === 'medium'
                                  ? '#f1c40f'
                                  : finding.severity === 'low'
                                    ? '#2ecc71'
                                    : '#3498db',
                          color: 'white',
                        }}
                      >
                        {finding.severity}
                      </span>
                    </div>
                    {finding.filePath && <div style={styles.findingFile}>{finding.filePath}</div>}
                    <div style={styles.findingMessage}>{finding.message}</div>
                    {finding.suggestion && (
                      <div style={styles.findingSuggestion}>
                        <strong>Suggestion:</strong> {finding.suggestion}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
  },
  header: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    marginBottom: '24px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  title: {
    margin: '0 0 8px 0',
    color: '#2c3e50',
    fontSize: '28px',
  },
  branch: {
    margin: 0,
    color: '#7f8c8d',
    fontSize: '16px',
  },
  meta: {
    margin: '4px 0 0 0',
    color: '#95a5a6',
    fontSize: '14px',
  },
  section: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    marginBottom: '24px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    color: '#2980b9',
    fontSize: '20px',
    borderBottom: '2px solid #3498db',
    paddingBottom: '8px',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '20px',
  },
  card: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  cardValue: {
    fontSize: '36px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  cardLabel: {
    fontSize: '14px',
    color: '#7f8c8d',
    textTransform: 'uppercase',
  },
  severityGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  severityBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  severityLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#2c3e50',
  },
  barContainer: {
    height: '12px',
    backgroundColor: '#ecf0f1',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '6px',
    transition: 'width 0.3s ease',
  },
  agentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '12px',
  },
  agentCard: {
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    textAlign: 'center',
  },
  agentName: {
    fontSize: '14px',
    color: '#7f8c8d',
    marginBottom: '4px',
  },
  agentCount: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  findingsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  findingCard: {
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    borderLeft: '4px solid',
  },
  findingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  findingFile: {
    fontSize: '12px',
    color: '#7f8c8d',
    marginBottom: '8px',
    fontFamily: 'monospace',
  },
  findingMessage: {
    marginBottom: '8px',
    lineHeight: '1.5',
  },
  findingSuggestion: {
    padding: '8px',
    backgroundColor: '#fff3cd',
    borderRadius: '4px',
    fontSize: '14px',
    color: '#856404',
  },
}
