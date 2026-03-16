import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { Config, DEFAULT_CONFIG, ProviderConfig } from './types.js'

// Simple parser that handles JSON (we'll upgrade to yaml later)
function parseConfig(content: string): any {
  return JSON.parse(content)
}

function stringifyConfig(config: any): string {
  return JSON.stringify(config, null, 2)
}

export class ConfigManager {
  private configPath: string

  constructor(configPath?: string) {
    this.configPath = configPath || join(homedir(), '.git-copilot', 'config.json')
  }

  async loadConfig(): Promise<Config> {
    if (!existsSync(this.configPath)) {
      await this.saveConfig(DEFAULT_CONFIG)
      return DEFAULT_CONFIG
    }

    const content = readFileSync(this.configPath, 'utf-8')
    const configObj = parseConfig(content)
    const config = this.validateConfig(configObj)

    // Decrypt API keys (simple base64 decode)
    for (const provider of config.providers) {
      if (provider.apiKey && provider.apiKey.startsWith('encrypted:')) {
        const encryptedKey = provider.apiKey.replace('encrypted:', '')
        try {
          provider.apiKey = Buffer.from(encryptedKey, 'base64').toString('utf-8')
        } catch {
          provider.apiKey = ''
        }
      }
    }

    return config
  }

  async saveConfig(config: Config): Promise<void> {
    const dir = this.configPath.split('/').slice(0, -1).join('/') || '.'
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    // Encrypt API keys
    const configToSave = { ...config }
    configToSave.providers = config.providers.map((provider: ProviderConfig) => {
      if (provider.apiKey && !provider.apiKey.startsWith('encrypted:')) {
        const encrypted = Buffer.from(provider.apiKey).toString('base64')
        return {
          ...provider,
          apiKey: `encrypted:${encrypted}`,
        }
      }
      return provider
    })

    const content = stringifyConfig(configToSave)
    writeFileSync(this.configPath, content, 'utf-8')
  }

  validateConfig(config: any): Config {
    if (!config) {
      throw new Error('Config cannot be empty')
    }

    const mergedConfig = { ...DEFAULT_CONFIG, ...config }

    if (!Array.isArray(mergedConfig.providers)) {
      mergedConfig.providers = []
    }

    mergedConfig.providers = mergedConfig.providers.map((provider: any) => {
      if (!provider.name || !provider.baseUrl || !provider.model || provider.maxTokens === undefined) {
        throw new Error(`Invalid provider config: ${JSON.stringify(provider)}`)
      }
      return provider as ProviderConfig
    })

    if (mergedConfig.review.concurrentAgents < 1 || mergedConfig.review.concurrentAgents > 8) {
      throw new Error('concurrentAgents must be between 1 and 8')
    }

    if (mergedConfig.activeProvider) {
      const exists = mergedConfig.providers.some((p: ProviderConfig) => p.name === mergedConfig.activeProvider)
      if (!exists) {
        console.warn(`Active provider '${mergedConfig.activeProvider}' not found, clearing`)
        mergedConfig.activeProvider = ''
      }
    }

    return mergedConfig as Config
  }

  async encryptApiKey(key: string): Promise<string> {
    return `encrypted:${Buffer.from(key).toString('base64')}`
  }

  async decryptApiKey(encryptedKey: string): Promise<string | null> {
    if (encryptedKey.startsWith('encrypted:')) {
      const base64 = encryptedKey.replace('encrypted:', '')
      try {
        return Buffer.from(base64, 'base64').toString('utf-8')
      } catch {
        return null
      }
    }
    return encryptedKey
  }

  async getActiveProvider(): Promise<ProviderConfig | undefined> {
    const config = await this.loadConfig()
    if (!config.activeProvider) {
      return undefined
    }
    return config.providers.find((p: ProviderConfig) => p.name === config.activeProvider) || undefined
  }

  async setActiveProvider(name: string): Promise<void> {
    const config = await this.loadConfig()
    const exists = config.providers.some((p: ProviderConfig) => p.name === name)
    if (!exists) {
      throw new Error(`Provider '${name}' not found`)
    }
    config.activeProvider = name
    await this.saveConfig(config)
  }

  async addProvider(provider: ProviderConfig): Promise<void> {
    const config = await this.loadConfig()

    if (config.providers.some((p: ProviderConfig) => p.name === provider.name)) {
      throw new Error(`Provider '${provider.name}' already exists`)
    }

    config.providers.push(provider)
    await this.saveConfig(config)
  }

  async removeProvider(name: string): Promise<boolean> {
    const config = await this.loadConfig()
    const initialLength = config.providers.length
    config.providers = config.providers.filter((p: ProviderConfig) => p.name !== name)

    if (config.activeProvider === name) {
      config.activeProvider = ''
    }

    if (config.providers.length === initialLength) {
      return false
    }

    await this.saveConfig(config)
    return true
  }

  async getProviderList(): Promise<string[]> {
    const config = await this.loadConfig()
    return config.providers.map((p: ProviderConfig) => p.name)
  }
}
