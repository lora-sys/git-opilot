export interface Skill {
  id: string
  name: string
  description: string
  category: string
  priority: number
  content: string
  path: string
  tags?: string[]
}

export interface SkillsManagerConfig {
  builtInDir: string
  customDir?: string
}
