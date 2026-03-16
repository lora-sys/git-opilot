import { LLMAdapter, ChatMessage, LLMOptions, LLMConfig } from '../adapter.js'

/**
 * OpenAI-specific LLM adapter
 * Docs: https://platform.openai.com/docs/api-reference/chat
 */
export class OpenAIAdapter extends LLMAdapter {
  private baseUrl: string

  constructor() {
    super()
    this.baseUrl = 'https://api.openai.com/v1'
  }

  /**
   * Configure with OpenAI-specific options
   */
  configure(config: Partial<LLMConfig>): void {
    super.configure(config)
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl
    }
    // Set default model if not provided
    if (!this.config.model) {
      this.config.model = 'gpt-4o'
    }
  }

  async chat(messages: ChatMessage[], options: LLMOptions = {}): Promise<string> {
    this.validateConfig(['apiKey', 'model'])
    const mergedOptions = this.mergeOptions(options)

    // Build request body
    const body = {
      model: this.getConfig().model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        ...(msg.name && { name: msg.name }),
      })),
      stream: false,
      temperature: mergedOptions.temperature,
      max_tokens: mergedOptions.maxTokens,
      top_p: mergedOptions.topP,
      stop: mergedOptions.stopSequences,
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getConfig().apiKey}`,
          ...(this.getConfig().organization && { 'OpenAI-Organization': this.getConfig().organization }),
          ...this.getConfig().headers,
        },
        body: JSON.stringify(body),
        signal: mergedOptions.timeout ? AbortSignal.timeout(mergedOptions.timeout) : null,
      })

      if (!response.ok) {
        const error = (await response.json().catch(() => ({ error: { message: response.statusText } }))) as any
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`)
      }

      const data = (await response.json()) as any
      return data.choices[0]?.message?.content || ''
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout')
      }
      throw error
    }
  }

  async *stream(messages: ChatMessage[], options: LLMOptions = {}): AsyncIterable<string> {
    this.validateConfig(['apiKey', 'model'])
    const mergedOptions = this.mergeOptions({ ...options, stream: true })

    const body = {
      model: this.getConfig().model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        ...(msg.name && { name: msg.name }),
      })),
      stream: true,
      temperature: mergedOptions.temperature,
      max_tokens: mergedOptions.maxTokens,
      top_p: mergedOptions.topP,
      stop: mergedOptions.stopSequences,
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getConfig().apiKey}`,
        ...(this.getConfig().organization && { 'OpenAI-Organization': this.getConfig().organization }),
        ...this.getConfig().headers,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => ({ error: { message: response.statusText } }))) as any
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`)
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
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          const data = trimmed.slice(6)
          if (data === '[DONE]') return

          try {
            const parsed = JSON.parse(data) as any
            const content = parsed.choices[0]?.delta?.content
            if (content) {
              yield content
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
    // For OpenAI, we can use tiktoken approximation: ~4 chars per token for English
    // For more accuracy, would need to use the tokenizer library
    if (!text) return 0
    return Math.ceil(text.length / 4)
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; timestamp: Date; error?: string }> {
    try {
      // Simple model list request to verify API key works
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.getConfig().apiKey}`,
        },
      })

      if (response.ok) {
        return { status: 'healthy', timestamp: new Date() }
      } else {
        return { status: 'unhealthy', timestamp: new Date(), error: `HTTP ${response.status}` }
      }
    } catch (error: any) {
      return { status: 'unhealthy', timestamp: new Date(), error: error.message }
    }
  }
}
