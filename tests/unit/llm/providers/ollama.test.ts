import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OllamaAdapter } from '@/llm/providers/ollama'

describe('OllamaAdapter', () => {
  let adapter: OllamaAdapter

  beforeEach(() => {
    adapter = new OllamaAdapter()
    adapter.configure({
      model: 'llama2',
    })
  })

  describe('Configuration', () => {
    it('should set default model to llama2', () => {
      const newAdapter = new OllamaAdapter()
      newAdapter.configure({})
      expect(newAdapter.getConfig().model).toBe('llama2')
    })

    it('should use custom baseUrl and strip trailing slash', () => {
      const customAdapter = new OllamaAdapter()
      customAdapter.configure({
        baseUrl: 'http://localhost:8080/',
        model: 'custom-model',
      })
      expect(customAdapter['baseUrl']).toBe('http://localhost:8080')
    })

    it('should keep baseUrl without trailing slash', () => {
      const adapter = new OllamaAdapter()
      adapter.configure({ baseUrl: 'http://localhost:11434' })
      expect(adapter['baseUrl']).toBe('http://localhost:11434')
    })
  })

  describe('chat', () => {
    it('should make correct API call', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          message: { content: 'Hello from Llama!' },
        }),
      })

      global.fetch = mockFetch

      const messages = [{ role: 'user', content: 'Hello!' }]

      const response = await adapter.chat(messages)

      expect(response).toBe('Hello from Llama!')
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.model).toBe('llama2')
      expect(callBody.messages).toHaveLength(1)
      expect(callBody.stream).toBe(false)
      expect(callBody.options).toBeDefined()
    })

    it('should include options in request', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: { content: 'OK' } }),
      })
      global.fetch = mockFetch

      await adapter.chat([{ role: 'user', content: 'test' }], {
        temperature: 0.7,
        maxTokens: 100,
        stopSequences: ['END'],
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.options.temperature).toBe(0.7)
      expect(callBody.options.num_predict).toBe(100)
      expect(callBody.options.stop).toEqual(['END'])
    })

    it('should throw on API error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'model not found' }),
      })
      global.fetch = mockFetch

      await expect(adapter.chat([{ role: 'user', content: 'test' }])).rejects.toThrow(
        'Ollama API error: model not found'
      )
    })

    it('should validate model requirement', async () => {
      const unconfiguredAdapter = new OllamaAdapter()
      // No model set, only apiKey if any
      await expect(unconfiguredAdapter.chat([{ role: 'user', content: 'test' }])).rejects.toThrow('model')
    })
  })

  describe('stream', () => {
    it('should stream responses', async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            const chunks = [
              '{"message":{"content":"Hello"},"done":false}\n',
              '{"message":{"content":" World"},"done":false}\n',
              '{"done":true}\n',
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

    it('should handle empty content chunks', async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('{"message":{"content":""},"done":false}\n'))
            controller.enqueue(new TextEncoder().encode('{"done":true}\n'))
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

      expect(chunks).toEqual([]) // empty content ignored
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
    it('should return healthy when Ollama is running with model', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: 'llama2' }, { name: 'codellama' }],
        }),
      })
      global.fetch = mockFetch

      const health = await adapter.healthCheck()
      expect(health.status).toBe('healthy')
    })

    it('should return unhealthy when model not available', async () => {
      adapter.configure({ model: 'nonexistent' })
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: 'llama2' }],
        }),
      })
      global.fetch = mockFetch

      const health = await adapter.healthCheck()
      expect(health.status).toBe('unhealthy')
      expect(health.error).toContain('nonexistent')
    })

    it('should return unhealthy when Ollama not running', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Connection refused'))
      global.fetch = mockFetch

      const health = await adapter.healthCheck()
      expect(health.status).toBe('unhealthy')
      expect(health.error).toContain('Connection refused')
    })
  })

  describe('listModels', () => {
    it('should list available models', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            { name: 'llama2:7b', size: 3825819519 },
            { name: 'codellama:13b', size: 7364661649 },
          ],
        }),
      })
      global.fetch = mockFetch

      const models = await adapter.listModels()
      expect(models).toHaveLength(2)
      expect(models[0]).toHaveProperty('name', 'llama2:7b')
      expect(models[0]).toHaveProperty('size', 3825819519)
    })

    it('should throw on error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: false, statusText: 'Failed' })
      global.fetch = mockFetch

      await expect(adapter.listModels()).rejects.toThrow('Failed to list models')
    })
  })
})
