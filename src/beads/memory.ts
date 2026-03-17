import { v4 as uuidv4 } from 'uuid'

export interface Finding {
  type: 'security' | 'performance' | 'quality' | 'architecture'
  content: string
  filePath?: string
  lineRange?: { start: number; end: number }
  priority: number
  agentSource: string
  createdAt: Date
  tags: string[]
  relatedTaskId?: string
}

export class MemoryManager {
  private db: any

  constructor(db: any) {
    this.db = db
    this.initialize()
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS findings (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        file_path TEXT,
        line_start INTEGER,
        line_end INTEGER,
        priority INTEGER NOT NULL,
        agent_source TEXT NOT NULL,
        created_at TEXT NOT NULL,
        tags TEXT NOT NULL,
        related_task_id TEXT
      )
    `)
  }

  storeFinding(finding: Finding): string {
    const id = uuidv4()
    const stmt = this.db.prepare(`
      INSERT INTO findings (
        id, type, content, file_path, line_start, line_end,
        priority, agent_source, created_at, tags, related_task_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      finding.type,
      finding.content,
      finding.filePath || null,
      finding.lineRange?.start || null,
      finding.lineRange?.end || null,
      finding.priority,
      finding.agentSource,
      finding.createdAt.toISOString(),
      JSON.stringify(finding.tags),
      finding.relatedTaskId || null
    )

    return id
  }

  searchFindings(query: string, limit?: number): Finding[] {
    const searchPattern = `%${query}%`
    const sql = `
      SELECT * FROM findings
      WHERE ? = '' OR content LIKE ? OR tags LIKE ?
      ORDER BY priority DESC, created_at DESC
      ${limit ? 'LIMIT ?' : ''}
    `
    const params: any[] = [query, searchPattern, searchPattern]
    if (limit) params.push(limit)

    const rows = this.db.prepare(sql).all(...params) as any[]
    return rows.map(this.rowToFinding)
  }

  getFindingsByTask(taskId: string): Finding[] {
    const rows = this.db
      .prepare(
        `
      SELECT * FROM findings
      WHERE related_task_id = ?
      ORDER BY created_at DESC
    `
      )
      .all(taskId) as any[]
    return rows.map(this.rowToFinding)
  }

  clearFindings(filter?: { retentionDays?: number; taskId?: string }): void {
    let whereClause = '1=1'
    const params: any[] = []

    if (filter?.retentionDays) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - filter.retentionDays)
      whereClause += ` AND created_at < ?`
      params.push(cutoff.toISOString())
    }

    if (filter?.taskId) {
      whereClause += ` AND related_task_id = ?`
      params.push(filter.taskId)
    }

    this.db.prepare(`DELETE FROM findings WHERE ${whereClause}`).run(...params)
  }

  private rowToFinding(row: any): Finding {
    return {
      type: row.type,
      content: row.content,
      filePath: row.file_path,
      lineRange: row.line_start != null ? { start: row.line_start, end: row.line_end } : undefined,
      priority: row.priority,
      agentSource: row.agent_source,
      createdAt: new Date(row.created_at),
      tags: JSON.parse(row.tags || '[]'),
      relatedTaskId: row.related_task_id,
    } as any
  }
}
