import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock simple-git
vi.mock('simple-git', () => {
  const mockGit = {
    init: vi.fn().mockReturnThis(),
    status: vi.fn(),
    log: vi.fn(),
    diff: vi.fn(),
    branch: vi.fn(),
    tags: vi.fn(),
    show: vi.fn(),
    revparse: vi.fn(),
    raw: vi.fn(),
  }

  return {
    default: vi.fn(() => mockGit),
    simpleGit: vi.fn(() => mockGit),
  }
})

// Import the mocked module after mocking
import { GitCollector } from '../../../src/git/collector'
import simpleGit from 'simple-git'

describe('GitCollector', () => {
  let collector: GitCollector
  let mockGit: any

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks()
    // Create fresh collector
    collector = new GitCollector('/fake/repo/path')
    // Get the mock instance from the mocked simple-git
    mockGit = simpleGit()
  })

  describe('getRepositoryInfo', () => {
    it('should fetch repository root and current branch', async () => {
      mockGit.revparse.mockResolvedValue('/fake/repo/path\n')
      mockGit.branch.mockResolvedValue({
        current: 'main',
        all: ['main', 'feature/test', 'remotes/origin/main', 'remotes/origin/feature/test'],
      } as any)
      mockGit.status.mockResolvedValue({
        staged: [],
        not_staged: [],
        untracked: [],
      })

      const info = await collector.getRepositoryInfo()

      expect(info.root).toBe('/fake/repo/path')
      expect(info.currentBranch).toBe('main')
    })
  })

  describe('getCommitHistory', () => {
    it('should fetch commit history with default options', async () => {
      mockGit.log.mockResolvedValue({
        all: [
          'abc123|John Doe|john@example.com|2024-01-15T10:30:00 +0000|feat: add new feature|def456',
          'def456|Jane Smith|jane@example.com|2024-01-14T09:00:00 +0000|fix: bug fix|',
        ],
      })

      const commits = await collector.getCommitHistory()

      expect(commits).toHaveLength(2)
      expect(commits[0].hash).toBe('abc123')
      expect(commits[0].author).toBe('John Doe')
      expect(commits[0].parentHashes).toContain('def456')
    })

    it('should respect --since option', async () => {
      mockGit.log.mockResolvedValue({ all: [] })

      await collector.getCommitHistory({ since: 'HEAD~10' })

      expect(mockGit.log).toHaveBeenCalledWith(
        expect.arrayContaining([
          '--all',
          '--max-count',
          '100',
          '--since',
          'HEAD~10',
          expect.stringMatching(/--pretty=/),
          '--date=iso',
        ])
      )
    })

    it('should respect --max option', async () => {
      mockGit.log.mockResolvedValue({ all: [] })

      await collector.getCommitHistory({ maxCommits: 5 })

      expect(mockGit.log).toHaveBeenCalledWith(
        expect.arrayContaining(['--all', '--max-count', '5', expect.stringMatching(/--pretty=/), '--date=iso'])
      )
    })
  })

  describe('getStatus', () => {
    it('should return current git status', async () => {
      mockGit.status.mockResolvedValue({
        staged: [{ file: 'src/file.ts', index: 'M', working_dir: ' ' }],
        not_staged: [{ file: 'src/other.ts', index: ' ', working_dir: 'M' }],
        untracked: ['new-file.ts'],
      })

      const status = await collector.getStatus()

      expect(status.staged).toHaveLength(1)
      expect(status.unstaged).toHaveLength(1)
      expect(status.untracked).toContain('new-file.ts')
    })
  })

  describe('getDiff', () => {
    it('should return file changes for a commit range', async () => {
      mockGit.diff.mockResolvedValue({
        lines: ['10\t2\tsrc/index.ts', '5\t0\tREADME.md', '0\t20\told.ts'],
      })

      const diff = await collector.getDiff('HEAD~2..HEAD')

      expect(diff).toHaveLength(3)
      expect(diff[0].path).toBe('src/index.ts')
      expect(diff[0].status).toBe('M')
      expect(diff[0].insertions).toBe(10)
      expect(diff[0].deletions).toBe(2)
    })
  })

  describe('getTags', () => {
    it('should fetch repository tags', async () => {
      mockGit.tags.mockResolvedValue(['v1.0.0', 'v0.9.0'])
      mockGit.show.mockResolvedValue('2024-01-01T00:00:00 +0000|John Doe|john@example.com|Tag message')

      const tags = await collector.getTags()

      expect(tags).toHaveLength(2)
      expect(tags[0].name).toBe('v1.0.0')
      expect(tags[0].message).toBe('Tag message')
    })
  })

  describe('getAllTrackedFiles', () => {
    it('should list all tracked files', async () => {
      mockGit.raw.mockResolvedValue('src/index.ts\nsrc/utils.ts\nREADME.md\n')

      const files = await collector.getAllTrackedFiles()

      expect(files).toEqual(['src/index.ts', 'src/utils.ts', 'README.md'])
    })
  })

  describe('getFileContent', () => {
    it('should fetch file content at specific commit', async () => {
      mockGit.raw.mockResolvedValue('file content here')

      const content = await collector.getFileContent('src/index.ts', 'abc123')

      expect(content).toBe('file content here')
      expect(mockGit.raw).toHaveBeenCalledWith(['show', 'abc123:src/index.ts'])
    })

    it('should fetch file content at current HEAD by default', async () => {
      mockGit.raw.mockResolvedValue('current content')

      const content = await collector.getFileContent('README.md')

      expect(mockGit.raw).toHaveBeenCalledWith(['show', 'HEAD:README.md'])
    })
  })

  describe('error handling', () => {
    it('should throw error when git command fails', async () => {
      mockGit.log.mockRejectedValue(new Error('git command failed'))

      await expect(collector.getCommitHistory()).rejects.toThrow('git command failed')
    })

    it('should handle non-zero exit codes', async () => {
      mockGit.revparse.mockRejectedValue({
        stdout: '',
        stderr: 'fatal: not a git repository',
        exitCode: 128,
      })

      await expect(collector.getRepositoryInfo()).rejects.toThrow()
    })
  })
})
