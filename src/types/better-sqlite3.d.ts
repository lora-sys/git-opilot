declare module 'better-sqlite3' {
  export default class Database {
    constructor(path: string, options?: any)
    prepare(sql: string): Statement
    exec(sql: string): void
    close(): void
  }

  export interface Statement {
    bind(...params: any[]): Statement
    get(...params: any[]): any
    all(...params: any[]): any[]
    run(...params: any[]): { changes: number; lastInsertRowid: number }
  }
}
