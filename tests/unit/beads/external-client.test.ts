import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BeadsExternalClient } from '../../../src/beads/external-client.js'

describe('BeadsExternalClient', () => {
  let client: BeadsExternalClient
  const mockConfig = {
    cliPath: 'bd',
    dataDir: '.beads',
    autoInstall: false,
  }

  beforeEach(() => {
    client = new BeadsExternalClient(mockConfig)
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should store config values', () => {
      expect(client['cliPath']).toBe('bd')
      expect(client['dataDir']).toBe('.beads')
    })
  })

  describe('isInstalled', () => {
    it('should return true when bd command exists', async () => {
      const mockExec = vi.fn().mockResolvedValue({ code: 0 })
      vi.stubGlobal('exec', mockExec)

      const result = await client.isInstalled()

      expect(result).toBe(true)
      expect(mockExec).toHaveBeenCalledWith('bd --version')
    })

    it('should return false when bd command not found', async () => {
      const mockExec = vi.fn().mockRejectedValue(new Error('Command not found'))
      vi.stubGlobal('exec', mockExec)

      const result = await client.isInstalled()

      expect(result).toBe(false)
    })
  })

  describe('init', () => {
    it('should run bd init successfully', async () => {
      const mockExec = vi.fn().mockResolvedValue({ code: 0, stdout: 'Initialized' })
      vi.stubGlobal('exec', mockExec)

      await client.init()

      expect(mockExec).toHaveBeenCalledWith('bd init')
    })

    it('should throw if init fails', async () => {
      const mockExec = vi.fn().mockResolvedValue({ code: 1, stderr: 'Error' })
      vi.stubGlobal('exec', mockExec)

      await expect(client.init()).rejects.toThrow('Beads init failed')
    })
  })

  describe('createTask', () => {
    it('should create task and return ID', async () => {
      const mockExec = vi.fn().mockResolvedValue({
        code: 0,
        stdout: JSON.stringify({ id: 'task-123', title: 'Test' }),
      })
      vi.stubGlobal('exec', mockExec)

      const taskId = await client.createTask('Test task', 5)

      expect(taskId).toBe('task-123')
      expect(mockExec).toHaveBeenCalledWith('bd create "Test task" -p 5')
    })

    it('should use default priority 0 when not specified', async () => {
      const mockExec = vi.fn().mockResolvedValue({
        code: 0,
        stdout: JSON.stringify({ id: 'task-456', title: 'Test' }),
      })
      vi.stubGlobal('exec', mockExec)

      await client.createTask('Test task')

      expect(mockExec).toHaveBeenCalledWith('bd create "Test task" -p 0')
    })
  })

  describe('createSubTask', () => {
    it('should create subtask under parent', async () => {
      const mockExec = vi.fn().mockResolvedValue({
        code: 0,
        stdout: JSON.stringify({ id: 'sub-123', title: 'Subtask' }),
      })
      vi.stubGlobal('exec', mockExec)

      const subId = await client.createSubTask('parent-123', 'Subtask')

      expect(subId).toBe('sub-123')
      expect(mockExec).toHaveBeenCalledWith('bd create Subtask --parent parent-123')
    })
  })

  describe('claimTask', () => {
    it('should claim task successfully', async () => {
      const mockExec = vi.fn().mockResolvedValue({ code: 0 })
      vi.stubGlobal('exec', mockExec)

      const result = await client.claimTask('task-123')

      expect(result).toBe(true)
      expect(mockExec).toHaveBeenCalledWith('bd update task-123 --claim')
    })

    it('should return false if claim fails', async () => {
      const mockExec = vi.fn().mockResolvedValue({ code: 1, stderr: 'Already claimed' })
      vi.stubGlobal('exec', mockExec)

      const result = await client.claimTask('task-123')

      expect(result).toBe(false)
    })
  })

  describe('closeTask', () => {
    it('should close task with reason', async () => {
      const mockExec = vi.fn().mockResolvedValue({ code: 0 })
      vi.stubGlobal('exec', mockExec)

      await client.closeTask('task-123', 'Completed work')

      expect(mockExec).toHaveBeenCalledWith('bd close task-123 "Completed work"')
    })
  })

  describe('getReadyTasks', () => {
    it('should return list of ready tasks', async () => {
      const mockExec = vi.fn().mockResolvedValue({
        code: 0,
        stdout: JSON.stringify([
          { id: 'task-1', title: 'Ready 1', status: 'open' },
          { id: 'task-2', title: 'Ready 2', status: 'open' },
        ]),
      })
      vi.stubGlobal('exec', mockExec)

      const tasks = await client.getReadyTasks()

      expect(tasks).toHaveLength(2)
      expect(tasks[0]).toHaveProperty('id', 'task-1')
      expect(mockExec).toHaveBeenCalledWith('bd ready --json')
    })
  })

  describe('addDependency', () => {
    it('should add dependency between child and parent', async () => {
      const mockExec = vi.fn().mockResolvedValue({ code: 0 })
      vi.stubGlobal('exec', mockExec)

      await client.addDependency('child-123', 'parent-456')

      expect(mockExec).toHaveBeenCalledWith('bd dep add child-123 parent-456')
    })
  })

  describe('exec', () => {
    it('should execute arbitrary bd commands', async () => {
      const mockExec = vi.fn().mockResolvedValue({
        code: 0,
        stdout: 'Output',
        stderr: '',
      })
      vi.stubGlobal('exec', mockExec)

      const result = await client.exec(['show', 'task-123'])

      expect(result).toEqual({
        stdout: 'Output',
        stderr: '',
        code: 0,
      })
      expect(mockExec).toHaveBeenCalledWith('bd show task-123')
    })
  })
})
