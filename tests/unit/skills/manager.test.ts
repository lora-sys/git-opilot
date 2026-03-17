import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import SkillsManager from '@/skills/manager.ts'
import type { Skill } from '@/skills/types.ts'

describe('SkillsManager', () => {
  let builtInDir: string
  let customDir: string
  let manager: SkillsManager

  const createSkill = (dir: string, id: string, category: string, priority: number = 10) => {
    const skillDir = join(dir, id)
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(
      join(skillDir, 'meta.json'),
      JSON.stringify({
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        description: `Description for ${id}`,
        category,
        priority,
        tags: [category],
      })
    )
    writeFileSync(join(skillDir, 'SKILL.md'), `# ${id}\n\nContent for ${id}`)
  }

  beforeEach(() => {
    builtInDir = join(tmpdir(), `git-copilot-test-builtin-${Date.now()}`)
    customDir = join(tmpdir(), `git-copilot-test-custom-${Date.now()}`)
    mkdirSync(builtInDir, { recursive: true })
    mkdirSync(customDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(builtInDir, { recursive: true, force: true })
    rmSync(customDir, { recursive: true, force: true })
  })

  it('should load built-in skills from directory', () => {
    createSkill(builtInDir, 'code-review', 'domain', 10)
    createSkill(builtInDir, 'security-audit', 'security', 20)

    manager = new SkillsManager(builtInDir)

    const skills = manager.getAllSkills()
    expect(skills).toHaveLength(2)
    expect(skills.map((s) => s.id)).toContain('code-review')
    expect(skills.map((s) => s.id)).toContain('security-audit')
  })

  it('should load custom skills with higher priority', () => {
    createSkill(builtInDir, 'code-review', 'domain', 10)
    createSkill(customDir, 'code-review', 'domain', 100) // custom overrides

    manager = new SkillsManager(builtInDir, customDir)

    const skills = manager.getAllSkills()
    expect(skills).toHaveLength(1) // custom overrides built-in with same id
    expect(skills[0].priority).toBe(100)
    expect(skills[0].path).toContain('custom')
  })

  it('should combine built-in and custom skills without duplication', () => {
    createSkill(builtInDir, 'code-review', 'domain', 10)
    createSkill(builtInDir, 'performance', 'performance', 15)
    createSkill(customDir, 'custom-skill', 'custom', 5)

    manager = new SkillsManager(builtInDir, customDir)

    const skills = manager.getAllSkills()
    expect(skills).toHaveLength(3)
  })

  it('should get skills for specific agent type by tags', () => {
    createSkill(builtInDir, 'security-review', 'security', 20)
    createSkill(builtInDir, 'code-quality', 'code-quality', 15)
    createSkill(builtInDir, 'performance-optimization', 'performance', 18)

    manager = new SkillsManager(builtInDir)

    const securitySkills = manager.getSkillsForAgent('security', ['security'])
    expect(securitySkills).toHaveLength(1)
    expect(securitySkills[0].id).toBe('security-review')

    const qualitySkills = manager.getSkillsForAgent('code-quality', ['code-quality'])
    expect(qualitySkills).toHaveLength(1)
  })

  it('should return empty array when no skills match', () => {
    createSkill(builtInDir, 'security-review', 'security', 20)

    manager = new SkillsManager(builtInDir)

    const result = manager.getSkillsForAgent('performance', ['performance'])
    expect(result).toHaveLength(0)
  })

  it('should reload skills from disk', async () => {
    createSkill(builtInDir, 'initial-skill', 'domain', 10)

    manager = new SkillsManager(builtInDir)
    expect(manager.getAllSkills()).toHaveLength(1)

    // Add another skill
    createSkill(builtInDir, 'new-skill', 'domain', 12)

    await manager.reload()

    const skills = manager.getAllSkills()
    expect(skills).toHaveLength(2)
    expect(skills.map((s) => s.id)).toContain('new-skill')
  })

  it('should handle missing built-in directory gracefully', () => {
    // builtInDir doesn't exist
    manager = new SkillsManager('/nonexistent/path')
    expect(manager.getAllSkills()).toHaveLength(0)
  })

  it('should handle missing custom directory gracefully', () => {
    createSkill(builtInDir, 'skill1', 'domain', 10)
    manager = new SkillsManager(builtInDir, '/nonexistent/custom')
    expect(manager.getAllSkills()).toHaveLength(1)
  })

  it('should return skill by id', () => {
    createSkill(builtInDir, 'unique-skill', 'special', 30)
    manager = new SkillsManager(builtInDir)

    const skill = manager.getSkillById('unique-skill')
    expect(skill).toBeDefined()
    expect(skill?.id).toBe('unique-skill')
  })

  it('should return undefined for non-existent skill id', () => {
    createSkill(builtInDir, 'existing', 'domain', 10)
    manager = new SkillsManager(builtInDir)

    const skill = manager.getSkillById('nonexistent')
    expect(skill).toBeUndefined()
  })

  it('should prioritize skills by priority (higher number = higher priority)', () => {
    createSkill(builtInDir, 'low-priority', 'domain', 5)
    createSkill(builtInDir, 'medium-priority', 'domain', 15)
    createSkill(builtInDir, 'high-priority', 'domain', 25)

    manager = new SkillsManager(builtInDir)

    const skills = manager.getSkillsForAgent('domain', ['domain'])
    // Should be sorted by priority descending
    expect(skills[0].id).toBe('high-priority')
    expect(skills[1].id).toBe('medium-priority')
    expect(skills[2].id).toBe('low-priority')
  })

  it('should handle malformed meta.json gracefully', () => {
    const skillDir = join(builtInDir, 'broken-skill')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(join(skillDir, 'meta.json'), 'invalid json')
    writeFileSync(join(skillDir, 'SKILL.md'), 'content')

    // Should not throw, just skip the broken skill
    manager = new SkillsManager(builtInDir)
    expect(manager.getAllSkills()).toHaveLength(0)
  })
})
