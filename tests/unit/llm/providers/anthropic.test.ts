import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnthropicAdapter } from '@/llm/providers/anthropic'

describe('AnthropicAdapter', () => {
  let adapter: AnthropicAdapter

  beforeEach(() => {
    adapter = new AnthropicAdapter()
    adapter.configure({
      apiKey: 'test-anthropic-key',
      model: 'claude-sonnet-4-20250514',
    })
  })

  describe('Configuration', () => {
    it('should set default model to claude-sonnet-4', () => {
      const newAdapter = new AnthropicAdapter()
      newAdapter.configure({ apiKey: 'test' })
      expect(newAdapter.getConfig().model).toBe('claude-sonnet-4-20250514')
    })

    it('should allow custom baseUrl', () => {
      const customAdapter = new AnthropicAdapter()
      customAdapter.configure({
        apiKey: 'test',
        baseUrl: 'http://localhost:8080',
      })
      expect(customAdapter['baseUrl']).toBe('http://localhost:8080')
    })
  })

  describe('chat', () => {
    it('should make correct API call', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: 'Hello from Claude!' }],
        }),
      })

      global.fetch = mockFetch

      const messages = [
        { role: 'system', content: 'Be helpful.' },
        { role: 'user', content: 'Hello!' },
      ]

      const response = await adapter.chat(messages)

      expect(response).toBe('Hello from Claude!')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/2023-06-01/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'test-anthropic-key',
            'anthropic-version': '2023-06-01',
          }),
        })
      )

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.model).toBe('claude-sonnet-4-20250514')
      expect(callBody.messages).toHaveLength(1) // system filtered out
      expect(callBody.messages[0].role).toBe('user')
      expect(callBody.system).toBe('Be helpful.')
    })

    it('should separate system message from conversation', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: [{ text: 'OK' }] }),
      })
      global.fetch = mockFetch

      const messages = [
        { role: 'system', content: 'You are a poet.' },
        { role: 'user', content: 'Write a haiku.' },
        { role: 'assistant', content: 'Spring arrives softly.' },
      ]

      await adapter.chat(messages)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.system).toBe('You are a poet.')
      expect(callBody.messages).toHaveLength(2) // user + assistant, no system
      expect(callBody.messages[0].role).toBe('user')
      expect(callBody.messages[1].role).toBe('assistant')
    })

    it('should handle messages without system', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: [{ text: 'OK' }] }),
      })
      global.fetch = mockFetch

      const messages = [{ role: 'user', content: 'Hello' }]

      await adapter.chat(messages)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.system).toBeUndefined()
      expect(callBody.messages).toHaveLength(1)
    })

    it('should throw on API error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Invalid API key' } }),
      })
      global.fetch = mockFetch

      await expect(adapter.chat([{ role: 'user', content: 'test' }])).rejects.toThrow(
        'Anthropic API error: Invalid API key'
      )
    })

    it('should respect options', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: [{ text: 'OK' }] }),
      })
      global.fetch = mockFetch

      await adapter.chat([{ role: 'user', content: 'test' }], {
        temperature: 0.5,
        maxTokens: 200,
        stopSequences: ['END'],
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.temperature).toBe(0.5)
      expect(callBody.max_tokens).toBe(200)
      expect(callBody.stop_sequences).toEqual(['END'])
    })

    it('should validate required config', async () => {
      const unconfiguredAdapter = new AnthropicAdapter()
      await expect(unconfiguredAdapter.chat([{ role: 'user', content: 'test' }])).rejects.toThrow('apiKey')
    })
  })

  describe('stream', () => {
    it('should stream responses', async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            const chunks = [
              'data: {"type":"content_block_delta","delta":{"text":"Hello"}}\n',
              'data: {"type":"content_block_delta","delta":{"text":" World"}}\n',
              'data: {"type":"message_stop"}\n',
            ]
            controller.enqueue(new TextEncoder().encode(chunks.join('')))
            controller.close()
          },
        }),
      }

      const mockFetch = vi.fn().mockResolvedValue(mockResponse)
      global.fetch = mockFetch

      const stream = await adapter.stream([{ role: 'user', content: 'test' }])
      const chunks: string[] = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(['Hello', ' World'])
    })

    it('should skip non-delta events', async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            const chunks = [
              'data: {"type":"message_start"}\n',
              'data: {"type":"content_block_delta","delta":{"text":"Hi"}}\n',
              'data: {"type":"ping"}\n',
            ]
            controller.enqueue(new TextEncoder().encode(chunks.join('')))
            controller.close()
          },
        }),
      }

      const mockFetch = vi.fn().mockResolvedValue(mockResponse)
      global.fetch = mockFetch

      const stream = await adapter.stream([{ role: 'user', content: 'test' }])
      const chunks: string[] = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(['Hi'])
    })
  })

  describe('countTokens', () => {
    it('should return 0 for empty string', async () => {
      expect(await adapter.countTokens('')).toBe(0)
    })

    it('should approximate tokens', async () => {
      const count = await adapter.countTokens('Hello world!')
      expect(count).toBeGreaterThan(0)
    })
  })

  describe('healthCheck', () => {
    it('should return healthy on 200/400 response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true })
      global.fetch = mockFetch

      const health = await adapter.healthCheck()
      expect(health.status).toBe('healthy')
    })

    it('should return unhealthy on 500 error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })
      global.fetch = mockFetch

      const health = await adapter.healthCheck()
      expect(health.status).toBe('unhealthy')
    })
  })
})
