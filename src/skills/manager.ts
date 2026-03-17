import { readdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { Skill } from './types.js'

export default class SkillsManager {
  private builtInDir: string
  private customDir: string | undefined
  private skills: Skill[] = []

  constructor(builtInDir: string, customDir?: string) {
    this.builtInDir = builtInDir
    this.customDir = customDir
    this.loadSkills()
  }

  private loadSkills(): void {
    const loaded: Skill[] = []

    // Load built-in skills
    if (existsSync(this.builtInDir)) {
      loaded.push(...this.loadFromDirectory(this.builtInDir, 'built-in'))
    }

    // Load custom skills (they override built-ins with same id)
    if (this.customDir && existsSync(this.customDir)) {
      const customSkills = this.loadFromDirectory(this.customDir, 'custom')
      const customMap = new Map(customSkills.map((s) => [s.id, s]))
      const builtInFiltered = loaded.filter((s) => !customMap.has(s.id))
      loaded.length = 0
      loaded.push(...builtInFiltered)
      loaded.push(...customSkills)
    }

    // Sort by priority descending
    this.skills = loaded.sort((a, b) => b.priority - a.priority)
  }

  private loadFromDirectory(dir: string, _source: 'built-in' | 'custom'): Skill[] {
    const skills: Skill[] = []

    try {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue

        const skillDir = join(dir, entry.name)
        const metaPath = join(skillDir, 'meta.json')
        const skillPath = join(skillDir, 'SKILL.md')

        if (!existsSync(metaPath) || !existsSync(skillPath)) {
          continue // skip invalid skill directories
        }

        try {
          const metaContent = readFileSync(metaPath, 'utf-8')
          const meta = JSON.parse(metaContent) as {
            id: string
            name: string
            description: string
            category: string
            priority: number
            tags?: string[]
          }

          const content = readFileSync(skillPath, 'utf-8')

          const skill: Skill = {
            id: meta.id,
            name: meta.name,
            description: meta.description,
            category: meta.category,
            priority: meta.priority,
            tags: meta.tags || [],
            content,
            path: skillDir,
          }

          skills.push(skill)
        } catch (parseErr) {
          // Silently skip malformed skills
          continue
        }
      }
    } catch (err) {
      // If directory can't be read, just return empty array
    }

    return skills
  }

  getAllSkills(): Skill[] {
    return [...this.skills]
  }

  getSkillById(id: string): Skill | undefined {
    return this.skills.find((s) => s.id === id)
  }

  getSkillsForAgent(agentType: string, tags?: string[]): Skill[] {
    let result = this.skills

    if (tags && tags.length > 0) {
      result = result.filter((skill) => tags.some((tag) => skill.tags?.includes(tag) ?? false))
    }

    // Also match by category if agentType matches a category
    const categoryMatch = result.filter((s) => s.category === agentType)
    if (categoryMatch.length > 0) {
      return categoryMatch
    }

    return result
  }

  async reload(): Promise<void> {
    this.loadSkills()
  }
}
