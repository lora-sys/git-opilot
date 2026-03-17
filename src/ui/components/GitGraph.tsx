import React, { useState, useCallback, useEffect } from 'react'
import { Text, useInput } from 'ink'
import { buildGraphLayout } from '../git-graph.js'

interface GitGraphProps {
  commits: Array<{
    hash: string
    shortHash: string
    refs: string[]
    message: string
    author: string
    date: Date
    parentHashes: string[]
  }>
  onSelect?: (commit: any, index: number) => void
}

export default function GitGraph({ commits, onSelect }: GitGraphProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const lines = buildGraphLayout(commits)

  useInput((input, key) => {
    if (key.downArrow || input === 'j') {
      setSelectedIndex((prev) => Math.min(prev + 1, lines.length - 1))
    } else if (key.upArrow || input === 'k') {
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (key.return) {
      onSelect?.(commits[selectedIndex], selectedIndex)
    }
  })

  // Notify parent when selection changes (optional)
  useEffect(() => {
    onSelect?.(commits[selectedIndex], selectedIndex)
  }, [selectedIndex, onSelect, commits])

  return (
    <>
      <Text bold>Commit History (use j/k to navigate, Enter to select)</Text>
      {lines.map((line, idx) => (
        <Text key={idx} color={idx === selectedIndex ? 'green' : undefined} bold={idx === selectedIndex}>
          {line}
          {'\n'}
        </Text>
      ))}
    </>
  )
}
