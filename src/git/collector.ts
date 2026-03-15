import simpleGit, { SimpleGit, LogResult } from 'simple-git';
import { GitError } from '../utils/errors.js';
import { Logger, logger } from '../utils/logger.js';

export interface CommitInfo {
  hash: string;
  message: string;
  authorName: string;
  authorEmail: string;
  date: string;
  parents: string[];
}

export interface BranchInfo {
  name: string;
  current: boolean;
  upstream?: string;
  ahead?: number;
  behind?: number;
}

export interface RepositoryStatus {
  branch: string;
  remoteBranches: string[];
  branchInfo: BranchInfo[];
  commits: CommitInfo[];
  changedFiles: string[];
  stagedFiles: string[];
  untrackedFiles: string[];
  aheadCount: number;
  behindCount: number;
}

export class GitCollector {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string = process.cwd()) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  async isGitRepository(): Promise<boolean> {
    try {
      await this.git.revparse(['--is-inside-work-tree']);
      return true;
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<RepositoryStatus> {
    try {
      const [statusResult, branchResult, logResult] = await Promise.all([
        this.git.status(),
        this.git.branch(['-av']),
        this.git.log({ maxCount: 100 })
      ]);

      return this.parseStatus(statusResult, branchResult, logResult);
    } catch (error) {
      throw new GitError(`Failed to collect git data: ${error instanceof Error ? error.message : String(error)}`, {
        repoPath: this.repoPath,
        originalError: error
      });
    }
  }

  async getCommits(limit?: number, since?: string): Promise<CommitInfo[]> {
    try {
      const options: { maxCount?: number; since?: string } = {};
      if (limit) options.maxCount = limit;
      if (since) options.since = since;

      const result = await this.git.log(options);
      return result.all.map(c => this.parseCommit(c));
    } catch (error) {
      throw new GitError(`Failed to get commits: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getCommitRange(from: string, to: string = 'HEAD'): Promise<CommitInfo[]> {
    try {
      const result = await this.git.log({ from, to, maxCount: 1000 });
      return result.all.map(c => this.parseCommit(c));
    } catch (error) {
      throw new GitError(`Failed to get commits from ${from} to ${to}`, { originalError: error });
    }
  }

  async getDiff(from: string, to: string = 'HEAD'): Promise<string> {
    try {
      const diff = await this.git.diff([from, to]);
      return diff;
    } catch (error) {
      throw new GitError(`Failed to get diff: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getChangedFilesSince(commit: string): Promise<string[]> {
    try {
      const diff = await this.git.diff(['--name-only', commit]);
      return diff.split('\n').filter(Boolean);
    } catch (error) {
      throw new GitError(`Failed to get changed files since ${commit}`, { originalError: error });
    }
  }

  async getBranches(): Promise<BranchInfo[]> {
    try {
      const result = await this.git.branch(['-av']);
      return this.parseBranches(result.all);
    } catch (error) {
      throw new GitError(`Failed to get branches: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getCurrentBranch(): Promise<string> {
    try {
      const result = await this.git.branch(['--show-current']);
      return result.current.trim();
    } catch (error) {
      throw new GitError(`Failed to get current branch: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getRemotes(): Promise<string[]> {
    try {
      const result = await this.git.remote(['-v']);
      return result.all
        .map(line => line.split('\t')[0])
        .filter((name, index, arr) => arr.indexOf(name) === index);
    } catch (error) {
      throw new GitError(`Failed to get remotes: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getTags(): Promise<string[]> {
    try {
      const result = await this.git.tags();
      return result.all;
    } catch (error) {
      throw new GitError(`Failed to get tags: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async hasStagedChanges(): Promise<boolean> {
    try {
      const status = await this.git.status();
      return status.staged.length > 0;
    } catch {
      return false;
    }
  }

  private parseStatus(
    status: { files: { path: string; index: string; working_dir: string }[]; current: string },
    branch: { all: string[]; current: string },
    log: LogResult
  ): RepositoryStatus {
    const branchInfo = this.parseBranches(branch.all);
    const currentBranch = branch.current || branchInfo.find(b => b.current)?.name || '';

    const aheadCount = branchInfo.find(b => b.name === currentBranch)?.ahead || 0;
    const behindCount = branchInfo.find(b => b.name === currentBranch)?.behind || 0;

    return {
      branch: currentBranch,
      remoteBranches: [],
      branchInfo,
      commits: log.all.map(c => this.parseCommit(c)),
      changedFiles: status.files.filter(f => f.working_dir !== ' ').map(f => f.path),
      stagedFiles: status.files.filter(f => f.index !== ' ').map(f => f.path),
      untrackedFiles: status.files.filter(f => f.index === '?').map(f => f.path),
      aheadCount,
      behindCount
    };
  }

  private parseBranches(lines: string[]): BranchInfo[] {
    const branches: BranchInfo[] = [];

    for (const line of lines) {
      const match = line.match(/^(\*?)\s*([^\s]+)\s*(.+)?$/);
      if (!match) continue;

      const [, star, name, rest] = match;
      const current = star === '*';
      const upstreamMatch = rest?.match(/\[(.+?)(?:[:=](\d+))?(?:[:=](\d+))?\]/);

      branches.push({
        name,
        current,
        upstream: upstreamMatch?.[1] || undefined,
        ahead: upstreamMatch?.[2] ? parseInt(upstreamMatch[2]) : undefined,
        behind: upstreamMatch?.[3] ? parseInt(upstreamMatch[3]) : undefined
      });
    }

    return branches;
  }

  private parseCommit(commit: { hash: string; message: string; date: string; author_name: string; author_email: string; parents: string[] }): CommitInfo {
    return {
      hash: commit.hash,
      message: commit.message.trim(),
      authorName: commit.author_name,
      authorEmail: commit.author_email,
      date: commit.date,
      parents: commit.parents
    };
  }
}
