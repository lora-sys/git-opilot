// Config types for git-copilot
export interface ProviderConfig {
  name: string
  baseUrl: string
  apiKey?: string // Encrypted storage, decrypted on access
  model: string
  maxTokens: number
}

export interface ReviewConfig {
  concurrentAgents: number
  timeoutPerAgent: number // ms
  maxFilesPerAgent: number
  ignorePatterns: string[]
}

export interface OutputConfig {
  format: 'terminal' | 'markdown' | 'html' | 'json'
  outputDir: string
  generateHtml: boolean
  htmlTheme?: string
}

export interface UIConfig {
  theme: 'dark' | 'light' | 'auto'
  colors: ColorScheme
  animations: boolean
  compactMode: boolean
}

export interface ColorScheme {
  primary: string
  secondary: string
  success: string
  warning: string
  danger: string
  info: string
  muted: string
}

export interface SkillsConfig {
  enabled: boolean
  customPaths: string[]
  autoReload: boolean
}

export interface BeadsExternalConfig {
  enabled: boolean
  autoInstall: boolean
  cliPath: string
  dataDir: string
}

export interface BeadsCustomConfig {
  enabled: boolean
  maxFindingsPerTask: number
  retentionDays: number
  maxContextTokens: number
}

export interface BeadsConfig {
  external: BeadsExternalConfig
  custom: BeadsCustomConfig
}

export interface Config {
  providers: ProviderConfig[]
  activeProvider: string
  review: ReviewConfig
  output: OutputConfig
  ui: UIConfig
  skills: SkillsConfig
  beads: BeadsConfig
}

// Default values
export const DEFAULT_CONFIG: Config = {
  providers: [],
  activeProvider: '',
  review: {
    concurrentAgents: 4,
    timeoutPerAgent: 300000,
    maxFilesPerAgent: 1000,
    ignorePatterns: ['node_modules/', 'dist/', '.git/'],
  },
  output: {
    format: 'terminal',
    outputDir: './reports',
    generateHtml: false,
  },
  ui: {
    theme: 'dark',
    colors: {
      primary: '#61afef',
      secondary: '#98c379',
      success: '#98c379',
      warning: '#e5c07b',
      danger: '#e06c75',
      info: '#61afef',
      muted: '#7f848e',
    },
    animations: true,
    compactMode: false,
  },
  skills: {
    enabled: true,
    customPaths: [],
    autoReload: false,
  },
  beads: {
    external: {
      enabled: true,
      autoInstall: false,
      cliPath: 'bd',
      dataDir: '.beads',
    },
    custom: {
      enabled: true,
      maxFindingsPerTask: 100,
      retentionDays: 90,
      maxContextTokens: 4096,
    },
  },
}
