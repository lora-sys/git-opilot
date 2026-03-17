/**
 * Default color theme for terminal UI
 *
 * Color semantics:
 * - Red/Critical: High-risk security issues, critical performance problems
 * - Yellow/Medium: Medium severity findings, warnings
 * - Green/Low: Low severity, completed status, success
 * - Blue/Info: Informational messages, pending status, neutral
 * - Cyan/Running: Active operations, running agents
 * - White/Default: Normal text, headings
 */

export const colors = {
  // Severity colors
  critical: 'red', // #FF0000 or bright red
  high: 'red',
  medium: 'yellow',
  low: 'green',
  info: 'blue',

  // Status colors
  pending: 'blue',
  running: 'cyan',
  completed: 'green',
  error: 'red',

  // UI elements
  heading: 'white',
  border: 'gray',
  background: 'black',

  // Progress bar colors
  progressBar: {
    filled: 'green',
    empty: 'gray',
  },

  // Agent type colors (for differentiation)
  security: 'red',
  performance: 'yellow',
  architecture: 'blue',
  dependency: 'magenta',
  gitHistory: 'cyan',
  codeQuality: 'green',
}

// Ink uses ANSI color names or RGB hex values
export const theme = {
  // Text styles
  bold: { fontWeight: 'bold' },
  dim: { color: 'gray' },
  italic: { fontStyle: 'italic' },

  // Spacing
  padding: 1,
  margin: 1,

  // Progress bar
  progressBar: {
    filled: 'green',
    empty: 'gray',
  },
}
