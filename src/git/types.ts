export interface GitCommit {
  hash: string
  author: string
  email: string
  date: Date
  message: string
  parentHashes: string[]
  files: FileChange[]
}

export interface FileChange {
  path: string
  status: 'A' | 'M' | 'D' | 'R' | 'C' | 'U' | 'X' | 'B'
  insertions: number
  deletions: number
  oldPath?: string // for renames
}

export interface GitStatus {
  staged: FileChange[]
  unstaged: FileChange[]
  untracked: string[]
}

export interface GitBranch {
  current: string
  remotes: RemoteBranch[]
}

export interface RemoteBranch {
  name: string
  upstream: string
  ahead: number
  behind: number
}

export interface GitTag {
  name: string
  commit: string
  date: Date
  message?: string
}

export interface GitRepository {
  root: string
  currentBranch: string
  branches: GitBranch
  tags: GitTag[]
  latestCommits: GitCommit[]
  status: GitStatus
}

export interface GitCollectorOptions {
  since?: string // e.g., 'HEAD~10', '2024-01-01'
  until?: string
  maxCommits?: number
}
