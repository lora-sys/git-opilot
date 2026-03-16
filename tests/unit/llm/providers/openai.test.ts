import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OpenAIAdapter } from '@/llm/providers/openai'

describe('OpenAIAdapter', () => {
  let adapter: OpenAIAdapter

  beforeEach(() => {
    adapter = new OpenAIAdapter()
    adapter.configure({
      apiKey: 'test-openai-key',
      model: 'gpt-4o',
    })
  })

  describe('Configuration', () => {
    it('should set default model to gpt-4o', () => {
      const newAdapter = new OpenAIAdapter()
      newAdapter.configure({ apiKey: 'test' })
      expect(newAdapter.getConfig().model).toBe('gpt-4o')
    })

    it('should use custom baseUrl when provided', () => {
      const customAdapter = new OpenAIAdapter()
      customAdapter.configure({
        apiKey: 'test',
        baseUrl: 'http://localhost:8080/v1',
      })
      expect(customAdapter['baseUrl']).toBe('http://localhost:8080/v1')
    })
  })

  describe('chat', () => {
    it('should make correct API call', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello from GPT-4!' } }],
        }),
      })

      global.fetch = mockFetch

      const messages = [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hello!' },
      ]

      const response = await adapter.chat(messages)

      expect(response).toBe('Hello from GPT-4!')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-openai-key',
          }),
        })
      )

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.model).toBe('gpt-4o')
      expect(callBody.messages).toEqual(messages)
      expect(callBody.stream).toBe(false)
    })

    it('should include organization header when set', async () => {
      adapter.configure({ organization: 'org-123' })

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'OK' } }] }),
      })
      global.fetch = mockFetch

      await adapter.chat([{ role: 'user', content: 'test' }])

      const headers = mockFetch.mock.calls[0][1].headers
      expect(headers['OpenAI-Organization']).toBe('org-123')
    })

    it('should throw on API error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: { message: 'Invalid API key' } }),
      })
      global.fetch = mockFetch

      await expect(adapter.chat([{ role: 'user', content: 'test' }])).rejects.toThrow(
        'OpenAI API error: Invalid API key'
      )
    })

    it('should throw on network error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
      global.fetch = mockFetch

      await expect(adapter.chat([{ role: 'user', content: 'test' }])).rejects.toThrow('Network error')
    })

    it('should respect temperature option', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'OK' } }] }),
      })
      global.fetch = mockFetch

      await adapter.chat([{ role: 'user', content: 'test' }], { temperature: 0.7 })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.temperature).toBe(0.7)
    })

    it('should respect maxTokens option', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'OK' } }] }),
      })
      global.fetch = mockFetch

      await adapter.chat([{ role: 'user', content: 'test' }], { maxTokens: 500 })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.max_tokens).toBe(500)
    })

    it('should respect stopSequences option', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'OK' } }] }),
      })
      global.fetch = mockFetch

      await adapter.chat([{ role: 'user', content: 'test' }], { stopSequences: ['\n', '###'] })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.stop).toEqual(['\n', '###'])
    })

    it('should handle messages with name field', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'OK' } }] }),
      })
      global.fetch = mockFetch

      const messages = [{ role: 'user', content: 'Hello', name: 'Alice' }]

      await adapter.chat(messages)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.messages[0]).toHaveProperty('name', 'Alice')
    })

    it('should validate required config before API call', async () => {
      const unconfiguredAdapter = new OpenAIAdapter()
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
              'data: {"choices": [{"delta": {"content": "Hello"}}]}\n',
              'data: {"choices": [{"delta": {"content": " World"}}]}\n',
              'data: [DONE]\n',
            ]
            controller.enqueue(new TextEncoder().encode(chunks.join('')))
            controller.close()
          },
        }),
      }

      const mockFetch = vi.fn().mockResolvedValue(mockResponse)
      global.fetch = mockFetch

      const messages = [{ role: 'user', content: 'test' }]
      const stream = await adapter.stream(messages)

      const chunks: string[] = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(['Hello', ' World'])
    })

    it('should handle malformed SSE data gracefully', async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            const chunks = ['data: invalid json\n', 'data: {"choices": [{"delta": {"content": "Valid"}}]}\n']
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

      expect(chunks).toEqual(['Valid'])
    })
  })

  describe('countTokens', () => {
    it('should return 0 for empty string', async () => {
      const count = await adapter.countTokens('')
      expect(count).toBe(0)
    })

    it('should approximate tokens as ceil(length / 4)', async () => {
      const count = await adapter.countTokens('Hello world!')
      expect(count).toBe(3) // 12 chars / 4 = 3
    })
  })

  describe('healthCheck', () => {
    it('should return healthy when API key is valid', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ object: 'list', data: [] }),
      })
      global.fetch = mockFetch

      const health = await adapter.healthCheck()
      expect(health.status).toBe('healthy')
      expect(health.timestamp).toBeInstanceOf(Date)
    })

    it('should return unhealthy when API key is invalid', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      })
      global.fetch = mockFetch

      const health = await adapter.healthCheck()
      expect(health.status).toBe('unhealthy')
      expect(health.error).toBe('HTTP 401')
    })
  })
})
