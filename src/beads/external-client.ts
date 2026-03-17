import { exec as nodeExec } from 'child_process'
import { promisify } from 'util'

function shellEscape(arg: string): string {
  // Quote arguments containing spaces
  if (/\s/.test(arg)) {
    return JSON.stringify(arg)
  }
  return arg
}

function createExecFn(): (command: string) => Promise<{ stdout: string; stderr: string; code: number }> {
  // If globalThis.exec is set (e.g., in tests), use it directly
  if (typeof (globalThis as any).exec === 'function') {
    return (globalThis as any).exec as (cmd: string) => Promise<{ stdout: string; stderr: string; code: number }>
  }

  // Otherwise, use node's exec with promisify and add code
  const execAsync = promisify(nodeExec)
  return async (command: string) => {
    try {
      const { stdout, stderr } = await execAsync(command)
      return { stdout, stderr, code: 0 }
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        code: error.code || 1,
      }
    }
  }
}

export interface BeadsExternalConfig {
  cliPath: string
  dataDir: string
  autoInstall: boolean
}

export interface BeadsTask {
  id: string
  title: string
  status: 'open' | 'claimed' | 'done' | 'closed'
  priority: number
  createdAt: Date
}

export class BeadsExternalClient {
  private cliPath: string

  constructor(config: BeadsExternalConfig) {
    this.cliPath = config.cliPath
  }

  async isInstalled(): Promise<boolean> {
    try {
      const execFn = createExecFn()
      await execFn(`${this.cliPath} --version`)
      return true
    } catch {
      return false
    }
  }

  async init(): Promise<void> {
    const result = await this.exec(['init'])
    if (result.code !== 0) {
      throw new Error('Beads init failed')
    }
  }

  async createTask(title: string, priority: number = 0): Promise<string> {
    const args = ['create', title, '-p', priority.toString()]
    const result = await this.exec(args)
    const data = JSON.parse(result.stdout)
    return data.id
  }

  async createSubTask(parentId: string, title: string): Promise<string> {
    const args = ['create', title, '--parent', parentId]
    const result = await this.exec(args)
    const data = JSON.parse(result.stdout)
    return data.id
  }

  async claimTask(taskId: string): Promise<boolean> {
    const result = await this.exec(['update', taskId, '--claim'])
    if (result.code === 0) return true
    if (result.code === 1) return false
    throw new Error(`Failed to claim task: ${result.stderr}`)
  }

  async closeTask(taskId: string, reason: string): Promise<void> {
    await this.exec(['close', taskId, reason])
    // Optionally check result.code but ignore
  }

  async getTask(taskId: string): Promise<BeadsTask> {
    const result = await this.exec(['show', taskId, '--json'])
    if (result.code !== 0) {
      throw new Error(`Failed to get task: ${result.stderr}`)
    }
    return JSON.parse(result.stdout)
  }

  async getReadyTasks(): Promise<BeadsTask[]> {
    const result = await this.exec(['ready', '--json'])
    if (result.code !== 0) {
      throw new Error(`Failed to get ready tasks: ${result.stderr}`)
    }
    return JSON.parse(result.stdout)
  }

  async addDependency(childId: string, parentId: string): Promise<void> {
    const result = await this.exec(['dep', 'add', childId, parentId])
    if (result.code !== 0) {
      throw new Error(`Failed to add dependency: ${result.stderr}`)
    }
  }

  async exec(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
    const command = `${this.cliPath} ${args.map(shellEscape).join(' ')}`
    const execFn = createExecFn()
    const result = await execFn(command)
    return result
  }
}
