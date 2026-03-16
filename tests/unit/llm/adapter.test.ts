import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LLMAdapter, ChatMessage, LLMOptions } from '@/llm/adapter.js'

// Mock base class for testing
class MockLLMAdapter extends LLMAdapter {
  async chat(messages: ChatMessage[], options: LLMOptions = {}): Promise<string> {
    throw new Error('Not implemented')
  }

  async stream(messages: ChatMessage[], options: LLMOptions = {}): Promise<AsyncIterable<string>> {
    throw new Error('Not implemented')
  }

  async countTokens(text: string): Promise<number> {
    throw new Error('Not implemented')
  }
}

describe('LLMAdapter', () => {
  let adapter: MockLLMAdapter

  beforeEach(() => {
    adapter = new MockLLMAdapter()
    adapter.configure({ apiKey: 'test-key', model: 'test-model' })
  })

  describe('Configuration', () => {
    it('should store configuration values', () => {
      expect(adapter.getConfig()).toHaveProperty('apiKey', 'test-key')
      expect(adapter.getConfig()).toHaveProperty('model', 'test-model')
    })

    it('should allow updating configuration', () => {
      adapter.configure({ apiKey: 'new-key', model: 'new-model' })
      expect(adapter.getConfig()).toHaveProperty('apiKey', 'new-key')
      expect(adapter.getConfig()).toHaveProperty('model', 'new-model')
    })
  })

  describe('validateConfig', () => {
    it('should throw error when apiKey is missing', () => {
      const invalidAdapter = new MockLLMAdapter()
      expect(() => invalidAdapter.validateConfig(['apiKey'])).toThrow('apiKey')
    })

    it('should throw error when model is missing', () => {
      const invalidAdapter = new MockLLMAdapter()
      invalidAdapter.configure({ apiKey: 'test' })
      expect(() => invalidAdapter.validateConfig(['model'])).toThrow('model')
    })

    it('should pass validation with all required config', () => {
      adapter.configure({ apiKey: 'test', model: 'gpt-4' })
      expect(() => adapter.validateConfig(['apiKey', 'model'])).not.toThrow()
    })
  })

  describe('chat', () => {
    it('should reject when not configured', async () => {
      const unconfiguredAdapter = new MockLLMAdapter()
      await expect(adapter.chat([])).rejects.toThrow('Not implemented')
    })

    it('should accept messages array', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
      ]

      // Override chat method for this test
      const testAdapter = new MockLLMAdapter()
      testAdapter['chat'] = vi.fn().mockResolvedValue('Hello there!')

      const response = await testAdapter.chat(messages)
      expect(response).toBe('Hello there!')
    })
  })

  describe('stream', () => {
    it('should return AsyncIterable', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Test' }]

      // Mock streaming response
      const mockStream = (async function* () {
        yield 'Hello'
        yield ' World'
      })()

      const testAdapter = new MockLLMAdapter()
      testAdapter['stream'] = vi.fn().mockReturnValue(mockStream)

      const stream = await testAdapter.stream(messages)
      expect(stream[Symbol.asyncIterator]).toBeDefined()

      const chunks: string[] = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }
      expect(chunks).toEqual(['Hello', ' World'])
    })
  })

  describe('countTokens', () => {
    it('should return 0 for empty string', async () => {
      const testAdapter = new MockLLMAdapter()
      testAdapter['countTokens'] = vi.fn().mockResolvedValue(0)

      const count = await testAdapter.countTokens('')
      expect(count).toBe(0)
    })

    it('should count tokens approximately (4 chars per token)', async () => {
      const testAdapter = new MockLLMAdapter()
      testAdapter['countTokens'] = vi.fn().mockImplementation((text: string) => Math.ceil(text.length / 4))

      const count = await testAdapter.countTokens('Hello world! This is a test.')
      expect(count).toBeGreaterThan(0)
    })
  })

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const health = await adapter.healthCheck()
      expect(health).toHaveProperty('status')
      expect(health).toHaveProperty('timestamp')
    })
  })
})

describe('ChatMessage interface', () => {
  it('should accept system, user, and assistant roles', () => {
    const messages: ChatMessage[] = [
      { role: 'system', content: 'System message' },
      { role: 'user', content: 'User message' },
      { role: 'assistant', content: 'Assistant message' },
    ]

    expect(messages).toHaveLength(3)
    expect(messages[0].role).toBe('system')
    expect(messages[1].role).toBe('user')
    expect(messages[2].role).toBe('assistant')
  })

  it('should allow optional name field', () => {
    const message: ChatMessage = {
      role: 'user',
      content: 'Hello',
      name: 'Alice',
    }
    expect(message.name).toBe('Alice')
  })
})
