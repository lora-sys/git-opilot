import { LLMAdapter, ChatMessage, LLMOptions, LLMConfig } from '../adapter.js'

/**
 * Anthropic (Claude) LLM adapter
 * Docs: https://docs.anthropic.com/claude/reference/messages_post
 */
export class AnthropicAdapter extends LLMAdapter {
  private baseUrl: string
  private apiVersion: string

  constructor() {
    super()
    this.baseUrl = 'https://api.anthropic.com'
    this.apiVersion = '2023-06-01'
  }

  /**
   * Configure with Anthropic-specific options
   */
  configure(config: Partial<LLMConfig>): void {
    super.configure(config)
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl
    }
    // Set default model if not provided
    if (!this.config.model) {
      this.config.model = 'claude-sonnet-4-20250514'
    }
  }

  async chat(messages: ChatMessage[], options: LLMOptions = {}): Promise<string> {
    this.validateConfig(['apiKey', 'model'])
    const mergedOptions = this.mergeOptions(options)

    // Separate system message from conversation
    let systemMessage = ''
    const conversationMessages = messages.filter((msg) => {
      if (msg.role === 'system') {
        systemMessage = msg.content
        return false
      }
      return true
    })

    // Build request body
    const body: any = {
      model: this.getConfig().model,
      messages: conversationMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        ...(msg.name && { name: msg.name }),
      })),
      max_tokens: mergedOptions.maxTokens,
      temperature: mergedOptions.temperature,
      top_p: mergedOptions.topP,
      stop_sequences: mergedOptions.stopSequences,
      stream: false,
    }

    if (systemMessage) {
      body.system = systemMessage
    }

    try {
      const response = await fetch(`${this.baseUrl}/${this.apiVersion}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.getConfig().apiKey,
          'anthropic-version': this.apiVersion,
          ...this.getConfig().headers,
        },
        body: JSON.stringify(body),
        signal: mergedOptions.timeout ? AbortSignal.timeout(mergedOptions.timeout) : null,
      })

      if (!response.ok) {
        const error = (await response.json().catch(() => ({ error: { message: response.statusText } }))) as any
        throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`)
      }

      const data = (await response.json()) as any
      return data.content[0]?.text || ''
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

    let systemMessage = ''
    const conversationMessages = messages.filter((msg) => {
      if (msg.role === 'system') {
        systemMessage = msg.content
        return false
      }
      return true
    })

    const body: any = {
      model: this.getConfig().model,
      messages: conversationMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        ...(msg.name && { name: msg.name }),
      })),
      max_tokens: mergedOptions.maxTokens,
      temperature: mergedOptions.temperature,
      top_p: mergedOptions.topP,
      stop_sequences: mergedOptions.stopSequences,
      stream: true,
    }

    if (systemMessage) {
      body.system = systemMessage
    }

    const response = await fetch(`${this.baseUrl}/${this.apiVersion}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.getConfig().apiKey,
        'anthropic-version': this.apiVersion,
        ...this.getConfig().headers,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = (await response.json().catch(() => ({ error: { message: response.statusText } }))) as any
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`)
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
          try {
            const parsed = JSON.parse(data) as any
            if (parsed.type === 'content_block_delta') {
              const text = parsed.delta?.text
              if (text) {
                yield text
              }
            }
            if (parsed.type === 'message_stop') {
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
    // Anthropic uses ~4 chars per token for English
    if (!text) return 0
    return Math.ceil(text.length / 4)
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; timestamp: Date; error?: string }> {
    try {
      // Anthropic doesn't have a dedicated health endpoint, so we do a minimal request
      const response = await fetch(`${this.baseUrl}/${this.apiVersion}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.getConfig().apiKey,
          'anthropic-version': this.apiVersion,
        },
        body: JSON.stringify({
          model: this.getConfig().model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      })

      if (response.ok || response.status === 400) {
        // 400 means request invalid but API key/auth valid
        return { status: 'healthy', timestamp: new Date() }
      } else {
        return { status: 'unhealthy', timestamp: new Date(), error: `HTTP ${response.status}` }
      }
    } catch (error: any) {
      return { status: 'unhealthy', timestamp: new Date(), error: error.message }
    }
  }
}
