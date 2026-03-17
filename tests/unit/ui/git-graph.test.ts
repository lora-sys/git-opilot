import { describe, it, expect } from 'vitest'
import { buildGraphLayout } from '@/ui/git-graph.js'

interface Commit {
  hash: string
  shortHash: string
  refs: string[] // branch/tag names
  message: string
  author: string
  date: Date
  parentHashes: string[]
}

describe('buildGraphLayout', () => {
  it('should render linear history', () => {
    const commits: Commit[] = [
      {
        hash: 'abc123',
        shortHash: 'abc123',
        refs: [],
        message: 'Initial commit',
        author: 'Alice',
        date: new Date('2024-01-01'),
        parentHashes: [],
      },
      {
        hash: 'def456',
        shortHash: 'def456',
        refs: [],
        message: 'Second commit',
        author: 'Alice',
        date: new Date('2024-01-02'),
        parentHashes: ['abc123'],
      },
      {
        hash: 'ghi789',
        shortHash: 'ghi789',
        refs: [],
        message: 'Third commit',
        author: 'Bob',
        date: new Date('2024-01-03'),
        parentHashes: ['def456'],
      },
    ]

    const lines = buildGraphLayout(commits)

    expect(lines).toHaveLength(3)
    // Each line should contain the commit hash and message
    expect(lines[0]).toContain('abc123')
    expect(lines[0]).toContain('Initial commit')
    expect(lines[1]).toContain('def456')
    expect(lines[1]).toContain('Second commit')
    expect(lines[2]).toContain('ghi789')
    expect(lines[2]).toContain('Third commit')
  })

  it('should indicate branch merges', () => {
    const commits: Commit[] = [
      {
        hash: 'a',
        shortHash: 'a',
        refs: [],
        message: 'merge start',
        author: 'A',
        date: new Date(),
        parentHashes: [],
      },
      {
        hash: 'b',
        shortHash: 'b',
        refs: [],
        message: 'branch 1',
        author: 'A',
        date: new Date(),
        parentHashes: ['a'],
      },
      {
        hash: 'c',
        shortHash: 'c',
        refs: [],
        message: 'branch 2',
        author: 'A',
        date: new Date(),
        parentHashes: ['a'],
      },
      {
        hash: 'm',
        shortHash: 'm',
        refs: [],
        message: 'merge',
        author: 'A',
        date: new Date(),
        parentHashes: ['b', 'c'],
      },
    ]

    const lines = buildGraphLayout(commits)

    expect(lines).toHaveLength(4)
    // The merge commit should have two parents and the graph should reflect branching
    // We can check for presence of merge symbols like | or │
    // At least one line should contain merge indicator
    const hasMergeIndicator = lines.some((line) => line.includes('│') || line.includes('├') || line.includes('└'))
    expect(hasMergeIndicator).toBe(true)
  })
})
