import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { MemoryManager } from '../../../src/beads/memory.js'

describe('MemoryManager', () => {
  let manager: MemoryManager
  let db: any // better-sqlite3 Database instance

  beforeEach(() => {
    // Use in-memory database for tests
    db = Database(':memory:')
    manager = new MemoryManager(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('initialization', () => {
    it('should create findings table if not exists', () => {
      // Table is created in constructor
      const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='findings'").all()
      expect(rows).toHaveLength(1)
      expect(rows[0].name).toBe('findings')
    })
  })

  describe('storeFinding', () => {
    it('should store a finding and return its ID', () => {
      const finding = {
        type: 'security',
        content: 'Potential XSS vulnerability',
        filePath: 'src/app.js',
        lineRange: { start: 10, end: 15 },
        priority: 9,
        agentSource: 'SecurityAgent',
        createdAt: new Date('2025-03-16T12:00:00Z'),
        tags: ['xss', 'injection'],
        relatedTaskId: 'task-123',
      }

      const id = manager.storeFinding(finding)

      expect(id).toBeDefined()
      expect(typeof id).toBe('string')

      // Verify stored
      const row = db.prepare('SELECT * FROM findings WHERE id = ?').get(id)
      expect(row).toBeDefined()
      expect(row.type).toBe('security')
      expect(row.content).toBe(finding.content)
      expect(row.file_path).toBe(finding.filePath)
      expect(row.line_start).toBe(finding.lineRange.start)
      expect(row.line_end).toBe(finding.lineRange.end)
      expect(row.priority).toBe(finding.priority)
      expect(row.agent_source).toBe(finding.agentSource)
      expect(row.related_task_id).toBe(finding.relatedTaskId)
      expect(JSON.parse(row.tags)).toEqual(finding.tags)
    })

    it('should generate unique UUID for each finding', () => {
      const finding1 = { ...baseFinding, createdAt: new Date() }
      const finding2 = { ...baseFinding, createdAt: new Date() }

      const id1 = manager.storeFinding(finding1)
      const id2 = manager.storeFinding(finding2)

      expect(id1).not.toBe(id2)
    })
  })

  describe('searchFindings', () => {
    beforeEach(() => {
      // Insert sample findings
      const findings = [
        {
          type: 'security',
          content: 'Potential XSS vulnerability in render',
          filePath: 'src/render.js',
          priority: 9,
          agentSource: 'SecurityAgent',
          createdAt: new Date('2025-03-16T12:00:00Z'),
          tags: ['xss', 'injection'],
          relatedTaskId: 'task-1',
        },
        {
          type: 'performance',
          content: 'N+1 query problem detected',
          filePath: 'src/db.js',
          priority: 7,
          agentSource: 'PerformanceAgent',
          createdAt: new Date('2025-03-16T13:00:00Z'),
          tags: ['database', 'n-plus-1'],
          relatedTaskId: 'task-2',
        },
        {
          type: 'quality',
          content: 'Code duplication detected',
          filePath: 'src/utils.js',
          priority: 5,
          agentSource: 'CodeQualityAgent',
          createdAt: new Date('2025-03-16T14:00:00Z'),
          tags: ['duplication', 'maintainability'],
          relatedTaskId: 'task-3',
        },
      ]

      for (const f of findings) {
        manager.storeFinding(f)
      }
    })

    it('should search by keyword in content', () => {
      const results = manager.searchFindings('XSS')

      expect(results).toHaveLength(1)
      expect(results[0].type).toBe('security')
      expect(results[0].content).toContain('XSS')
    })

    it('should search by tag', () => {
      const results = manager.searchFindings('injection')

      expect(results).toHaveLength(1)
      expect(results[0].tags).toContain('xss')
    })

    it('should return all findings when query is empty', () => {
      const results = manager.searchFindings('')

      expect(results).toHaveLength(3)
    })

    it('should respect limit parameter', () => {
      const results = manager.searchFindings('', 2)

      expect(results).toHaveLength(2)
    })

    it('should search case-insensitively', () => {
      const results = manager.searchFindings('N+1')

      expect(results).toHaveLength(1)
      expect(results[0].type).toBe('performance')
    })
  })

  describe('getFindingsByTask', () => {
    beforeEach(() => {
      // Insert findings with different relatedTaskId
      manager.storeFinding({
        type: 'security',
        content: 'Issue 1',
        priority: 9,
        agentSource: 'SecurityAgent',
        createdAt: new Date(),
        tags: [],
        relatedTaskId: 'task-123',
      })
      manager.storeFinding({
        type: 'performance',
        content: 'Issue 2',
        priority: 7,
        agentSource: 'PerformanceAgent',
        createdAt: new Date(),
        tags: [],
        relatedTaskId: 'task-123',
      })
      manager.storeFinding({
        type: 'quality',
        content: 'Issue 3',
        priority: 5,
        agentSource: 'CodeQualityAgent',
        createdAt: new Date(),
        tags: [],
        relatedTaskId: 'task-456',
      })
    })

    it('should return findings for a specific task', () => {
      const findings = manager.getFindingsByTask('task-123')

      expect(findings).toHaveLength(2)
      expect(findings.map((f) => f.agentSource)).toContain('SecurityAgent')
      expect(findings.map((f) => f.agentSource)).toContain('PerformanceAgent')
    })

    it('should return empty array for non-existent task', () => {
      const findings = manager.getFindingsByTask('task-999')

      expect(findings).toHaveLength(0)
    })
  })

  describe('clearFindings', () => {
    beforeEach(() => {
      const now = new Date()
      const oldDate = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000) // 100 days ago
      const recentDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) // 10 days ago

      // Old finding (should be cleared by retention)
      manager.storeFinding({
        type: 'quality',
        content: 'Old issue',
        priority: 5,
        agentSource: 'CodeQualityAgent',
        createdAt: oldDate,
        tags: [],
      })

      // Recent finding (should be kept)
      manager.storeFinding({
        type: 'security',
        content: 'Recent issue',
        priority: 9,
        agentSource: 'SecurityAgent',
        createdAt: recentDate,
        tags: [],
      })
    })

    it('should clear findings older than retention days', () => {
      manager.clearFindings({ retentionDays: 90 })

      const remaining = db.prepare('SELECT COUNT(*) as count FROM findings').get()
      expect((remaining as any).count).toBe(1) // only recent remains
    })

    it('should clear all findings when no filter provided', () => {
      // First, add two findings
      manager.storeFinding({
        type: 'quality',
        content: 'Test 1',
        priority: 1,
        agentSource: 'TestAgent',
        createdAt: new Date(),
        tags: [],
      })
      manager.storeFinding({
        type: 'quality',
        content: 'Test 2',
        priority: 2,
        agentSource: 'TestAgent',
        createdAt: new Date(),
        tags: [],
      })

      manager.clearFindings()

      const count = db.prepare('SELECT COUNT(*) as count FROM findings').get()
      expect((count as any).count).toBe(0)
    })
  })
})

// Helper
const baseFinding = {
  type: 'security' as const,
  content: 'Potential XSS vulnerability',
  filePath: 'src/app.js',
  lineRange: { start: 10, end: 15 },
  priority: 9,
  agentSource: 'SecurityAgent',
  createdAt: new Date('2025-03-16T12:00:00Z'),
  tags: ['xss', 'injection'],
  relatedTaskId: 'task-123',
}
