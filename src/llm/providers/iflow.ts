import { LLMAdapter, ChatMessage, LLMOptions, LLMConfig } from '../adapter.js'

/**
 * iFlow LLM adapter
 * Custom API format: returns HTTP 200 even for errors, with {"code": "401", "success": false, "message": "..."}
 * Endpoint: https://api.iflow.cn/api/v1/chat/completions
 */
export class IFLowAdapter extends LLMAdapter {
  private baseUrl: string

  constructor() {
    super()
    this.baseUrl = 'https://api.iflow.cn/api/v1'
  }

  configure(config: Partial<LLMConfig>): void {
    super.configure(config)
    if (config.baseUrl) this.baseUrl = config.baseUrl
    if (!this.config.model) this.config.model = 'iflow-chat'
  }

  async chat(messages: ChatMessage[], options: LLMOptions = {}): Promise<string> {
    this.validateConfig(['apiKey', 'model'])
    const mergedOptions = this.mergeOptions(options)

    const body = {
      model: this.getConfig().model,
      messages: messages.map(msg => ({
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

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getConfig().apiKey}`,
        ...this.getConfig().headers,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    // iFlow returns HTTP 200 even for errors, check response.code
    if (data.code && data.code !== '200' && data.code !== '20000' && data.code !== 'OK') {
      throw new Error(`iFlow API error ${data.code}: ${data.message || 'Unknown error'}`)
    }

    if (!response.ok) {
      throw new Error(`iFlow API error: HTTP ${response.status}`)
    }

    // Handle different response formats
    if (data.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content
    }

    // Some APIs use different format
    if (data.content) {
      return Array.isArray(data.content) ? data.content[0]?.text || '' : data.content
    }

    return ''
  }

  async *stream(messages: ChatMessage[], options: LLMOptions = {}): AsyncIterable<string> {
    this.validateConfig(['apiKey', 'model'])
    const mergedOptions = this.mergeOptions({ ...options, stream: true })

    const body = {
      model: this.getConfig().model,
      messages: messages.map(msg => ({
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
        ...this.getConfig().headers,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (data.code && data.code !== '200' && data.code !== '20000' && data.code !== 'OK') {
      throw new Error(`iFlow API error ${data.code}: ${data.message || 'Unknown error'}`)
    }

    if (!response.ok) {
      throw new Error(`iFlow API error: HTTP ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

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

          const dataStr = trimmed.slice(6)
          if (dataStr === '[DONE]') return

          try {
            const parsed = JSON.parse(dataStr)
            const content = parsed.choices?.[0]?.delta?.content || parsed.content || parsed.text
            if (content) yield content
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  async countTokens(text: string): Promise<number> {
    if (!text) return 0
    return Math.ceil(text.length / 4)
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; timestamp: Date; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getConfig().apiKey}`,
        },
        body: JSON.stringify({
          model: this.getConfig().model,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1,
        }),
      })

      const data = await response.json()

      if (response.ok && (!data.code || data.code === '200' || data.code === '20000' || data.code === 'OK')) {
        return { status: 'healthy', timestamp: new Date() }
      }

      const errorMsg = data.message || `HTTP ${response.status}`
      return { status: 'unhealthy', timestamp: new Date(), error: errorMsg }
    } catch (error: any) {
      return { status: 'unhealthy', timestamp: new Date(), error: error.message }
    }
  }
}
