/**
 * iFlow LLM Provider Integration Tests
 *
 * These tests make REAL API calls to iFlow platform.
 * Requires IFLOW_API_KEY environment variable.
 *
 * Run: npm run test:integration:llm
 */

import { describe, it, beforeAll, expect } from 'vitest'
import { IFLowAdapter } from '../../../src/llm/providers/iflow'

const shouldRun = Boolean(process.env.IFLOW_API_KEY)

describe('IFLowAdapter (Live API)', () => {
  let adapter: IFLowAdapter | null = null

  beforeAll(() => {
    if (!shouldRun) {
      throw new Error('SKIP: Set IFLOW_API_KEY environment variable to run these tests')
    }

    adapter = new IFLowAdapter()
    adapter.configure({
      apiKey: process.env.IFLOW_API_KEY!,
      model: 'iflow-chat', // Default model - adjust based on actual iFlow model name
    })
  })

  describe('Health Check', () => {
    it('should report healthy when API is reachable', async () => {
      if (!adapter) throw new Error('Adapter not initialized')

      const health = await adapter.healthCheck()
      expect(health.status).toBe('healthy')
      expect(health.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('chat()', () => {
    it('should return a simple response', async () => {
      if (!adapter) throw new Error('Adapter not initialized')

      const messages = [
        { role: 'user' as const, content: 'Hello, say "Hi" exactly' }
      ]

      const response = await adapter.chat(messages)

      expect(typeof response).toBe('string')
      expect(response.length).toBeGreaterThan(0)
    })

    it('should respect system message', async () => {
      if (!adapter) throw new Error('Adapter not initialized')

      const messages = [
        { role: 'system' as const, content: 'You are a terse assistant. Always respond with "Yes".' },
        { role: 'user' as const, content: 'Are you working?' }
      ]

      const response = await adapter.chat(messages)

      expect(response.trim()).toBe('Yes')
    })

    it('should handle multiple conversation turns', async () => {
      if (!adapter) throw new Error('Adapter not initialized')

      const messages = [
        { role: 'user' as const, content: 'My name is Alice.' },
        { role: 'assistant' as const, content: 'Nice to meet you, Alice!' },
        { role: 'user' as const, content: 'What is my name?' }
      ]

      const response = await adapter.chat(messages)

      expect(response).toContain('Alice')
    })

    it('should throw error with invalid API key', async () => {
      const badAdapter = new IFLowAdapter()
      badAdapter.configure({
        apiKey: 'invalid-key-12345',
        model: 'iflow-chat',
      })

      const messages = [{ role: 'user', content: 'test' }]

      await expect(badAdapter.chat(messages)).rejects.toThrow()
    })
  })

  describe('countTokens()', () => {
    it('should return 0 for empty string', async () => {
      if (!adapter) throw new Error('Adapter not initialized')

      const count = await adapter.countTokens('')
      expect(count).toBe(0)
    })

    it('should estimate token count correctly', async () => {
      if (!adapter) throw new Error('Adapter not initialized')

      // Roughly 250 tokens for 1000 chars
      const text = 'a'.repeat(1000)
      const count = await adapter.countTokens(text)

      // Should be around 250 (1000/4)
      expect(count).toBeGreaterThan(200)
      expect(count).toBeLessThan(300)
    })
  })

  describe('stream()', () => {
    it('should yield multiple chunks for longer response', async () => {
      if (!adapter) throw new Error('Adapter not initialized')

      const messages = [{ role: 'user', content: 'Write a short story about a cat.' }]
      const stream = adapter.stream(messages)

      const chunks: string[] = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }

      const fullText = chunks.join('')
      expect(fullText.length).toBeGreaterThan(50)
    })
  })
})
