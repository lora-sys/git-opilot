import { LLMAdapter, LLMConfig } from './adapter.js'
import { OpenAIAdapter } from './providers/openai.js'
import { AnthropicAdapter } from './providers/anthropic.js'
import { OllamaAdapter } from './providers/ollama.js'
import { IFLowAdapter } from './providers/iflow.js'

/**
 * Supported provider types
 */
export type ProviderType = 'openai' | 'anthropic' | 'ollama' | 'iflow'

/**
 * Factory for creating LLM adapters
 */
export class LLMFactory {
  private static providers: Map<ProviderType, { new (): LLMAdapter }>

  static {
    const map = new Map()
    map.set('openai', OpenAIAdapter)
    map.set('anthropic', AnthropicAdapter)
    map.set('ollama', OllamaAdapter)
    map.set('iflow', IFLowAdapter)
    LLMFactory.providers = map as Map<ProviderType, { new (): LLMAdapter }>
  }

  /**
   * Create an adapter for the specified provider
   */
  static create(provider: ProviderType, config: Partial<LLMConfig> = {}): LLMAdapter {
    const AdapterClass = this.providers.get(provider)

    if (!AdapterClass) {
      throw new Error(
        `Unknown provider: ${provider}. Supported providers: ${Array.from(this.providers.keys()).join(', ')}`
      )
    }

    const adapter = new AdapterClass()
    adapter.configure(config as any)
    return adapter
  }

  /**
   * Register a custom provider
   */
  static registerProvider(provider: ProviderType, AdapterClass: { new (): LLMAdapter }): void {
    this.providers.set(provider, AdapterClass)
  }

  /**
   * List all available providers
   */
  static listProviders(): ProviderType[] {
    return Array.from(this.providers.keys())
  }

  /**
   * Check if a provider is available
   */
  static hasProvider(provider: ProviderType): boolean {
    return this.providers.has(provider)
  }

  /**
   * Create adapter from configuration object
   */
  static fromConfig(config: {
    provider: ProviderType
    apiKey?: string
    model?: string
    baseUrl?: string
    organization?: string
  }): LLMAdapter {
    const { provider, ...adapterConfig } = config

    // Validate provider exists
    if (!this.hasProvider(provider)) {
      throw new Error(`Provider ${provider} not available`)
    }

    const adapter = this.create(provider)

    // Configure with available options
    if (adapterConfig.apiKey) adapter.configure({ apiKey: adapterConfig.apiKey })
    if (adapterConfig.model) adapter.configure({ model: adapterConfig.model })
    if (adapterConfig.baseUrl) adapter.configure({ baseUrl: adapterConfig.baseUrl })
    if (adapterConfig.organization) adapter.configure({ organization: adapterConfig.organization })

    return adapter
  }
}
