/**
 * Chat message structure for LLM conversations
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  name?: string // Optional user/assistant name
}

/**
 * Options for LLM API calls
 */
export interface LLMOptions {
  temperature?: number // 0-2, default 1
  maxTokens?: number // Maximum tokens in response
  topP?: number // Nucleus sampling parameter
  stopSequences?: string[] // Sequences that stop generation
  stream?: boolean // Enable streaming response
  timeout?: number // Timeout in milliseconds
  retryAttempts?: number // Number of retry attempts
}

/**
 * Configuration for an LLM provider
 */
export interface LLMConfig {
  apiKey: string
  model: string
  endpoint?: string // Custom API endpoint (for local models)
  organization?: string // Org ID for enterprise accounts
  headers?: Record<string, string> // Custom headers
  [key: string]: any // Allow provider-specific config
}

/**
 * Base abstract class for LLM provider adapters
 */
export abstract class LLMAdapter {
  protected config: LLMConfig

  constructor() {
    this.config = {} as LLMConfig
  }

  /**
   * Configure the adapter with provider-specific settings
   */
  configure(config: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): LLMConfig {
    return { ...this.config }
  }

  /**
   * Validate that required configuration is present
   */
  validateConfig(requiredFields: string[]): void {
    const missing: string[] = []

    for (const field of requiredFields) {
      if (!this.config[field] || typeof this.config[field] !== 'string' || !this.config[field].trim()) {
        missing.push(field)
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`)
    }
  }

  /**
   * Send a chat completion request and return the full response
   */
  abstract chat(messages: ChatMessage[], options?: LLMOptions): Promise<string>

  /**
   * Stream a chat completion response
   */
  abstract stream(messages: ChatMessage[], options?: LLMOptions): AsyncIterable<string>

  /**
   * Count tokens in a text string (approximation if exact count unavailable)
   */
  abstract countTokens(text: string): Promise<number>

  /**
   * Perform a health check on the provider
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; timestamp: Date; error?: string }> {
    try {
      // Default implementation: simple token count test
      await this.countTokens('test')
      return { status: 'healthy', timestamp: new Date() }
    } catch (error: any) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        error: error.message,
      }
    }
  }

  /**
   * Helper: Merge default options with user-provided options
   */
  protected mergeOptions(userOptions: LLMOptions = {}): Required<LLMOptions> {
    return {
      temperature: userOptions.temperature ?? 1,
      maxTokens: userOptions.maxTokens ?? 4096,
      topP: userOptions.topP ?? 1,
      stopSequences: userOptions.stopSequences ?? [],
      stream: userOptions.stream ?? false,
      timeout: userOptions.timeout ?? 30000,
      retryAttempts: userOptions.retryAttempts ?? 3,
    }
  }

  /**
   * Helper: Truncate messages to fit within token limit (simple implementation)
   */
  protected truncateMessages(messages: ChatMessage[], maxTokens: number): ChatMessage[] {
    // Simple approximation: 4 chars per token
    const estimatedTokens = (text: string) => Math.ceil(text.length / 4)

    let totalTokens = 0
    const truncated: ChatMessage[] = []

    for (const message of messages) {
      const messageTokens = estimatedTokens(message.content)

      if (totalTokens + messageTokens > maxTokens * 0.8) {
        // Stop before hitting limit (80% threshold)
        break
      }

      truncated.push(message)
      totalTokens += messageTokens
    }

    return truncated
  }
}
