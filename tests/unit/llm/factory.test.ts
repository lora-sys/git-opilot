import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LLMFactory } from '@/llm/factory.js'
import { LLMAdapter } from '@/llm/adapter.js'
import { OpenAIAdapter } from '@/llm/providers/openai.js'
import { AnthropicAdapter } from '@/llm/providers/anthropic.js'
import { OllamaAdapter } from '@/llm/providers/ollama.js'

describe('LLMFactory', () => {
  beforeEach(() => {
    // Reset to default providers before each test
    LLMFactory['providers'] = new Map([
      ['openai', OpenAIAdapter],
      ['anthropic', AnthropicAdapter],
      ['ollama', OllamaAdapter],
    ])
  })

  describe('create', () => {
    it('should create OpenAI adapter', () => {
      const adapter = LLMFactory.create('openai', { apiKey: 'test-key' })
      expect(adapter).toBeInstanceOf(OpenAIAdapter)
      expect(adapter.getConfig()).toHaveProperty('apiKey', 'test-key')
    })

    it('should create Anthropic adapter', () => {
      const adapter = LLMFactory.create('anthropic', { apiKey: 'test-key' })
      expect(adapter).toBeInstanceOf(AnthropicAdapter)
      expect(adapter.getConfig()).toHaveProperty('apiKey', 'test-key')
    })

    it('should create Ollama adapter', () => {
      const adapter = LLMFactory.create('ollama', { model: 'codellama' })
      expect(adapter).toBeInstanceOf(OllamaAdapter)
      expect(adapter.getConfig()).toHaveProperty('model', 'codellama')
    })

    it('should throw for unknown provider', () => {
      expect(() => {
        LLMFactory.create('unknown' as any)
      }).toThrow('Unknown provider: unknown')
    })

    it('should allow partial configuration', () => {
      const adapter = LLMFactory.create('openai')
      expect(() => adapter.validateConfig(['apiKey'])).toThrow('apiKey')
    })
  })

  describe('listProviders', () => {
    it('should list all registered providers', () => {
      const providers = LLMFactory.listProviders()
      expect(providers).toContain('openai')
      expect(providers).toContain('anthropic')
      expect(providers).toContain('ollama')
      expect(providers).toHaveLength(3)
    })
  })

  describe('hasProvider', () => {
    it('should return true for registered providers', () => {
      expect(LLMFactory.hasProvider('openai')).toBe(true)
      expect(LLMFactory.hasProvider('anthropic')).toBe(true)
      expect(LLMFactory.hasProvider('ollama')).toBe(true)
    })

    it('should return false for unregistered providers', () => {
      expect(LLMFactory.hasProvider('unknown' as any)).toBe(false)
    })
  })

  describe('registerProvider', () => {
    it('should allow registering custom providers', () => {
      class CustomAdapter extends LLMAdapter {
        async chat() {
          return ''
        }
        async stream() {
          return (async function* () {})()
        }
        async countTokens() {
          return 0
        }
      }

      LLMFactory.registerProvider('custom' as any, CustomAdapter)
      expect(LLMFactory.hasProvider('custom')).toBe(true)

      const adapter = LLMFactory.create('custom' as any)
      expect(adapter).toBeInstanceOf(CustomAdapter)
    })
  })

  describe('fromConfig', () => {
    it('should create adapter with full config', () => {
      const adapter = LLMFactory.fromConfig({
        provider: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-4-turbo',
        organization: 'org-123',
      })

      expect(adapter).toBeInstanceOf(OpenAIAdapter)
      expect(adapter.getConfig()).toEqual({
        apiKey: 'sk-test',
        model: 'gpt-4-turbo',
        organization: 'org-123',
      })
    })

    it('should create adapter with partial config', () => {
      const adapter = LLMFactory.fromConfig({
        provider: 'ollama',
        model: 'mistral',
      })

      expect(adapter).toBeInstanceOf(OllamaAdapter)
      expect(adapter.getConfig().model).toBe('mistral')
    })

    it('should throw for unknown provider', () => {
      expect(() => {
        LLMFactory.fromConfig({ provider: 'unknown' as any })
      }).toThrow('Provider unknown not available')
    })
  })
})
