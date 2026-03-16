import simpleGit from 'simple-git'
import { GitRepository, GitCommit, GitStatus, FileChange, GitTag, GitCollectorOptions } from './types.js'

export class GitCollector {
  private git: any
  private repoPath: string

  constructor(repoPath?: string) {
    this.repoPath = repoPath || process.cwd()
    const options = { baseDir: this.repoPath } as any
    this.git = (simpleGit as any)(options)
  }

  async getRepositoryInfo(): Promise<GitRepository> {
    const [revparseResult, branchesResult] = await Promise.all([
      this.git.revparse(['--show-toplevel']),
      this.git.branch(['-a', '--verbose']),
    ])

    const root = revparseResult.trim()
    const branchesData = branchesResult as any
    const currentBranch = branchesData.current
    const remotes = (branchesData.all || [])
      .filter((ref: string) => ref.startsWith('remotes/'))
      .map((ref: string) => {
        const parts = ref.replace('remotes/', '').split('/')
        return { name: parts[0], ref }
      })

    return {
      root,
      currentBranch,
      branches: {
        current: currentBranch,
        remotes: remotes as any, // simplified
      },
      tags: [],
      latestCommits: [],
      status: await this.getStatus(),
    }
  }

  async getCommitHistory(options: GitCollectorOptions = {}): Promise<GitCommit[]> {
    const { since, until, maxCommits = 100 } = options

    const logOptions = ['--all', '--max-count', maxCommits.toString()]

    if (since) {
      logOptions.push('--since', since)
    }
    if (until) {
      logOptions.push('--until', until)
    }

    // Format: hash, author, email, date, message, parents
    const format = '--pretty=format:%H|%an|%ae|%ad|%s|%P'
    const result = (await this.git.log([...logOptions, format, '--date=iso'])) as any

    const commits: GitCommit[] = result.all.map((line: string) => {
      const parts = line.split('|')
      const [hash, author, email, date, message, parents] = parts
      return {
        hash,
        author,
        email,
        date: new Date(date!),
        message,
        parentHashes: parents ? parents.split(' ') : [],
        files: [], // Will be populated separately if needed
      }
    })

    return commits
  }

  async getStatus(): Promise<GitStatus> {
    const status = (await this.git.status()) as any

    const staged: FileChange[] = status.staged.map((file: any) => ({
      path: file.file,
      status: this.mapStatusType(file.index),
      insertions: 0, // simple-git doesn't provide counts by default
      deletions: 0,
    }))

    const unstaged: FileChange[] = status.not_staged.map((file: any) => ({
      path: file.file,
      status: this.mapStatusType(file.working_dir),
      insertions: 0,
      deletions: 0,
    }))

    return {
      staged,
      unstaged,
      untracked: status.untracked,
    }
  }

  async getDiff(commitRange: string): Promise<FileChange[]> {
    // commitRange format: "HEAD~2..HEAD"
    const result = (await this.git.diff(['--numstat', commitRange])) as any

    const files: FileChange[] = result.lines.map((line: string) => {
      const [insertions = '0', deletions = '0', path = ''] = line.split('\t')
      return {
        path,
        status: 'M', // diff shows modified files
        insertions: parseInt(insertions, 10) || 0,
        deletions: parseInt(deletions, 10) || 0,
      }
    })

    return files
  }

  async getTags(): Promise<GitTag[]> {
    const tags = await this.git.tags(['-n']) // -n shows tagger info

    // simple-git tags returns string array like ["v1.0.0", "v1.1.0"]
    // We need to get details for each tag
    const detailedTags: GitTag[] = []

    for (const tagName of tags) {
      try {
        const show = (await this.git.show([`refs/tags/${tagName}`, '--pretty=format:%ai|%an|%ae|%B', '-s'])) as string
        const parts = show.split('|')
        if (parts.length < 4) continue
        const [date, , , ...messageParts] = parts
        detailedTags.push({
          name: tagName,
          commit: '', // Could get from another command
          date: new Date(date!),
          message: messageParts.join('|'),
        })
      } catch {
        // If tag show fails, add basic info
        detailedTags.push({
          name: tagName,
          commit: '',
          date: new Date(),
        })
      }
    }

    return detailedTags
  }

  async getAllTrackedFiles(): Promise<string[]> {
    const result = await this.git.raw(['ls-files'])
    return result.split('\n').filter(Boolean)
  }

  async getFileContent(filePath: string, commitHash?: string): Promise<string> {
    const ref = commitHash ? `${commitHash}:${filePath}` : `HEAD:${filePath}`
    try {
      const content = await this.git.raw(['show', ref])
      return content
    } catch (error) {
      // File may not exist at that commit
      throw new Error(`Failed to read file ${filePath} at ${ref}: ${error}`)
    }
  }

  private mapStatusType(statusChar: string): FileChange['status'] {
    const map: Record<string, FileChange['status']> = {
      A: 'A', // Added
      M: 'M', // Modified
      D: 'D', // Deleted
      R: 'R', // Renamed
      C: 'C', // Copied
      U: 'U', // Unmerged
      X: 'X', // Unknown
      B: 'B', // Broken pairing
    }
    return map[statusChar] || 'U'
  }
}
