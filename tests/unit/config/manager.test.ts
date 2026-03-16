import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { homedir } from 'os'
import { join } from 'path'
import { existsSync, unlinkSync, mkdirSync, writeFileSync } from 'fs'
import { ConfigManager } from '../../../src/config/manager'
import { Config, DEFAULT_CONFIG } from '../../../src/config/types'

describe('ConfigManager', () => {
  const testConfigPath = join(homedir(), '.git-copilot-test', 'config.json')
  let manager: ConfigManager

  beforeEach(() => {
    const testDir = join(homedir(), '.git-copilot-test')
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true })
    }
    manager = new ConfigManager(testConfigPath)
  })

  afterEach(() => {
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath)
    }
  })

  describe('loadConfig', () => {
    it('should create default config if none exists', async () => {
      const config = await manager.loadConfig()

      expect(config).toBeDefined()
      expect(config.providers).toEqual([])
      expect(config.review.concurrentAgents).toBe(4)
      expect(config.ui.theme).toBe('dark')
    })

    it('should load existing config file', async () => {
      const testConfig: Config = {
        ...DEFAULT_CONFIG,
        providers: [
          {
            name: 'openai',
            baseUrl: 'https://api.openai.com/v1',
            apiKey: 'encrypted-key-placeholder',
            model: 'gpt-4o',
            maxTokens: 4096,
          },
        ],
        activeProvider: 'openai',
      }

      // Write as JSON
      writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2))

      const config = await manager.loadConfig()

      expect(config.providers).toHaveLength(1)
      expect(config.providers[0].name).toBe('openai')
      expect(config.activeProvider).toBe('openai')
    })

    it('should throw error for invalid JSON', async () => {
      writeFileSync(testConfigPath, '{ invalid json content }')

      await expect(manager.loadConfig()).rejects.toThrow()
    })
  })

  describe('saveConfig', () => {
    it('should save config to file', async () => {
      const config: Config = {
        ...DEFAULT_CONFIG,
        providers: [
          {
            name: 'anthropic',
            baseUrl: 'https://api.anthropic.com',
            apiKey: 'sk-ant-encrypted',
            model: 'claude-sonnet-4-5',
            maxTokens: 8192,
          },
        ],
        activeProvider: 'anthropic',
      }

      await manager.saveConfig(config)
      expect(existsSync(testConfigPath)).toBe(true)

      // Verify by loading
      const loaded = await manager.loadConfig()
      expect(loaded.activeProvider).toBe('anthropic')
      expect(loaded.providers[0].model).toBe('claude-sonnet-4-5')
    })
  })

  describe('validateConfig', () => {
    it('should accept valid config', () => {
      const validConfig: Config = {
        ...DEFAULT_CONFIG,
        providers: [
          {
            name: 'test',
            baseUrl: 'https://test.com',
            apiKey: 'key',
            model: 'test-model',
            maxTokens: 1000,
          },
        ],
      }

      expect(() => manager.validateConfig(validConfig)).not.toThrow()
    })

    it('should reject config with invalid concurrentAgents', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        review: {
          ...DEFAULT_CONFIG.review,
          concurrentAgents: 0,
        },
      }

      expect(() => manager.validateConfig(invalidConfig)).toThrow('concurrentAgents must be between 1 and 8')
    })
  })

  describe('encrypt/decrypt API keys', () => {
    it('should encrypt and decrypt API key', async () => {
      const originalKey = 'sk-test-12345'

      const encrypted = await manager.encryptApiKey(originalKey)
      expect(encrypted).not.toBe(originalKey)
      expect(encrypted).toBeDefined()
      expect(encrypted.startsWith('encrypted:')).toBe(true)

      const decrypted = await manager.decryptApiKey(encrypted)
      expect(decrypted).toBe(originalKey)
    })
  })

  describe('getActiveProvider', () => {
    it('should return the active provider config', async () => {
      const config: Config = {
        ...DEFAULT_CONFIG,
        providers: [
          {
            name: 'openai',
            baseUrl: 'https://api.openai.com/v1',
            apiKey: 'key1',
            model: 'gpt-4o',
            maxTokens: 4096,
          },
          {
            name: 'anthropic',
            baseUrl: 'https://api.anthropic.com',
            apiKey: 'key2',
            model: 'claude-3',
            maxTokens: 8192,
          },
        ],
        activeProvider: 'anthropic',
      }

      await manager.saveConfig(config)
      const activeProvider = await manager.getActiveProvider()

      expect(activeProvider?.name).toBe('anthropic')
      expect(activeProvider?.model).toBe('claude-3')
    })

    it('should return null if no active provider', async () => {
      const config: Config = {
        ...DEFAULT_CONFIG,
        providers: [],
        activeProvider: '',
      }

      await manager.saveConfig(config)
      const activeProvider = await manager.getActiveProvider()

      expect(activeProvider).toBeUndefined()
    })
  })

  describe('addProvider', () => {
    it('should add a new provider', async () => {
      await manager.addProvider({
        name: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'llama2',
        maxTokens: 4096,
      })

      const updated = await manager.loadConfig()
      expect(updated.providers).toHaveLength(1)
      expect(updated.providers[0].name).toBe('ollama')
    })

    it('should not allow duplicate provider names', async () => {
      const provider = {
        name: 'test',
        baseUrl: 'https://test.com',
        model: 'test-model',
        maxTokens: 1000,
      }

      await manager.addProvider(provider)
      await expect(manager.addProvider(provider)).rejects.toThrow(`Provider '${provider.name}' already exists`)
    })
  })
})
