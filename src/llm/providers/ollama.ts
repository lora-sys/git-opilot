import { LLMAdapter, ChatMessage, LLMOptions, LLMConfig } from '../adapter.js'

/**
 * Ollama LLM adapter for local models
 * Docs: https://github.com/ollama/ollama/blob/main/docs/api.md
 */
export class OllamaAdapter extends LLMAdapter {
  private baseUrl: string

  constructor() {
    super()
    this.baseUrl = 'http://localhost:11434'
  }

  /**
   * Configure with Ollama-specific options
   */
  configure(config: Partial<LLMConfig>): void {
    super.configure(config)
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl.replace(/\/$/, '') // Remove trailing slash
    }
    // Set default model if not provided
    if (!this.config.model) {
      this.config.model = 'llama2'
    }
  }

  async chat(messages: ChatMessage[], options: LLMOptions = {}): Promise<string> {
    this.validateConfig(['model'])
    const mergedOptions = this.mergeOptions(options)

    // Build request body
    const body = {
      model: this.getConfig().model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      stream: false,
      options: {
        temperature: mergedOptions.temperature,
        top_p: mergedOptions.topP,
        num_predict: mergedOptions.maxTokens,
        stop: mergedOptions.stopSequences,
      },
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: mergedOptions.timeout ? AbortSignal.timeout(mergedOptions.timeout) : null,
      })

      if (!response.ok) {
        const error = (await response.json().catch(() => ({ error: response.statusText }))) as any
        throw new Error(`Ollama API error: ${error.error || response.statusText}`)
      }

      const data = (await response.json()) as any
      return data.message?.content || ''
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout')
      }
      throw error
    }
  }

  async *stream(messages: ChatMessage[], options: LLMOptions = {}): AsyncIterable<string> {
    this.validateConfig(['model'])
    const mergedOptions = this.mergeOptions({ ...options, stream: true })

    const body = {
      model: this.getConfig().model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      stream: true,
      options: {
        temperature: mergedOptions.temperature,
        top_p: mergedOptions.topP,
        num_predict: mergedOptions.maxTokens,
        stop: mergedOptions.stopSequences,
      },
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => ({ error: response.statusText }))) as any
      throw new Error(`Ollama API error: ${error.error || response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          try {
            const parsed = JSON.parse(trimmed) as any
            if (parsed.message?.content) {
              yield parsed.message.content
            }
            if (parsed.done) {
              return
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  async countTokens(text: string): Promise<number> {
    // Ollama doesn't have token counting API, use approximation
    if (!text) return 0
    return Math.ceil(text.length / 4)
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; timestamp: Date; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)

      if (response.ok) {
        const data = (await response.json()) as any
        // Check if our model is available
        const models = data.models || []
        const modelExists = models.some((m: any) => m.name === this.getConfig().model)
        return modelExists
          ? { status: 'healthy', timestamp: new Date() }
          : { status: 'unhealthy', timestamp: new Date(), error: `Model ${this.getConfig().model} not found` }
      } else {
        return { status: 'unhealthy', timestamp: new Date(), error: `HTTP ${response.status}` }
      }
    } catch (error: any) {
      return { status: 'unhealthy', timestamp: new Date(), error: error.message }
    }
  }

  /**
   * Pull a model from Ollama registry (helper method)
   */
  async pullModel(modelName?: string): Promise<void> {
    const model = modelName || this.getConfig().model
    const response = await fetch(`${this.baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model, stream: false }),
    })

    if (!response.ok) {
      throw new Error(`Failed to pull model ${model}: ${response.statusText}`)
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<{ name: string; size: number }[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`)
    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.statusText}`)
    }
    const data = (await response.json()) as any
    return (data.models || []).map((m: any) => ({
      name: m.name,
      size: m.size || 0,
    }))
  }
}
