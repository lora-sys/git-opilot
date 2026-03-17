/**
 * Build a simple ASCII graph layout for commit history.
 * This is a minimal implementation to satisfy tests.
 */

export interface Commit {
  hash: string
  shortHash: string
  refs: string[]
  message: string
  author: string
  date: Date
  parentHashes: string[]
}

export function buildGraphLayout(commits: Commit[]): string[] {
  return commits.map((commit) => {
    const refsPart = commit.refs.length > 0 ? ` (${commit.refs.join(', ')})` : ''
    const dateStr = commit.date.toISOString().split('T')[0]
    const baseInfo = `${commit.shortHash}${refsPart} ${commit.author} ${dateStr}: ${commit.message}`

    let graphSymbol: string
    if (commit.parentHashes.length === 0) {
      graphSymbol = '○' // root commit
    } else if (commit.parentHashes.length >= 2) {
      graphSymbol = '│' // merge indicator
    } else {
      graphSymbol = '├' // regular commit
    }

    return `${graphSymbol} ${baseInfo}`
  })
}
