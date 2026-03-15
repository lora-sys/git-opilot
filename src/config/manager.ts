import * as keytar from 'keytar';
import { readYamlFile, writeYamlFile, fileExists, getConfigDir, getConfigPath } from '../utils/file-utils.js';
import { ConfigError } from '../utils/errors.js';
import { Logger, logger } from '../utils/logger.js';

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyEncrypted: string;
  model: string;
  maxTokens: number;
}

export interface ConfigSchema {
  version: number;
  providers: ProviderConfig[];
  activeProvider: string;
  review: {
    concurrentAgents: number;
    timeout: number; // seconds
    maxFiles: number;
    ignore: string[];
  };
  output: {
    format: 'terminal' | 'markdown' | 'html' | 'json';
    directory: string;
    theme?: string;
  };
  ui: {
    theme: 'default' | 'dark' | 'light';
    colors: boolean;
    animations: boolean;
    language: 'en' | 'zh';
  };
  skills: {
    paths: string[];
    builtin: string[];
  };
  beads: {
    maxContextTokens: number;
    longTermRetentionDays: number;
    embeddingModel: string;
    crossAgentSharing: boolean;
    semanticSearchThreshold: number;
  };
}

const DEFAULT_CONFIG: ConfigSchema = {
  version: 1,
  providers: [],
  activeProvider: '',
  review: {
    concurrentAgents: 4,
    timeout: 300,
    maxFiles: 1000,
    ignore: ['node_modules', '.git', 'dist', 'build', 'coverage']
  },
  output: {
    format: 'terminal',
    directory: './git-copilot-reports'
  },
  ui: {
    theme: 'default',
    colors: true,
    animations: true,
    language: 'zh'
  },
  skills: {
    paths: [],
    builtin: [
      'code-review',
      'secure-code-review',
      'owasp-audit',
      'web-design-audit',
      'code-review-report',
      'docx',
      'pdf',
      'pptx',
      'xlsx',
      'frontend-design',
      'web-artifacts-builder',
      'theme-factory',
      'doc-coauthoring',
      'internal-comms',
      'mcp-builder',
      'skill-creator'
    ]
  },
  beads: {
    maxContextTokens: 4096,
    longTermRetentionDays: 90,
    embeddingModel: 'nomic-embed-text',
    crossAgentSharing: true,
    semanticSearchThreshold: 0.75
  }
};

export class ConfigManager {
  private configPath: string;
  private config: ConfigSchema;
  private static instance: ConfigManager | null = null;

  private constructor() {
    this.configPath = getConfigPath();
    this.config = this.loadConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): ConfigSchema {
    try {
      if (!fileExists(this.configPath)) {
        logger.warn(`Config file not found at ${this.configPath}, using defaults`);
        return { ...DEFAULT_CONFIG };
      }

      const loaded = readYamlFile<Partial<ConfigSchema>>(this.configPath);

      // Merge with defaults for missing fields
      return this.mergeWithDefaults(loaded);
    } catch (error) {
      throw new ConfigError(`Failed to load config: ${error instanceof Error ? error.message : String(error)}`, {
        path: this.configPath,
        originalError: error
      });
    }
  }

  private mergeWithDefaults(loaded: Partial<ConfigSchema>): ConfigSchema {
    return {
      ...DEFAULT_CONFIG,
      ...loaded,
      review: { ...DEFAULT_CONFIG.review, ...loaded.review },
      output: { ...DEFAULT_CONFIG.output, ...loaded.output },
      ui: { ...DEFAULT_CONFIG.ui, ...loaded.ui },
      skills: { ...DEFAULT_CONFIG.skills, ...loaded.skills },
      beads: { ...DEFAULT_CONFIG.beads, ...loaded.beads }
    };
  }

  async saveConfig(): Promise<void> {
    try {
      await ensureDir(dirname(this.configPath));
      await writeYamlFile(this.configPath, this.config);
    } catch (error) {
      throw new ConfigError(`Failed to save config: ${error instanceof Error ? error.message : String(error)}`, {
        path: this.configPath,
        originalError: error
      });
    }
  }

  getConfig(): ConfigSchema {
    return this.config;
  }

  getProvider(providerId?: string): ProviderConfig | null {
    const id = providerId || this.config.activeProvider;
    if (!id) return null;

    return this.config.providers.find(p => p.id === id) || null;
  }

  async setActiveProvider(providerId: string): Promise<void> {
    const provider = this.config.providers.find(p => p.id === providerId);
    if (!provider) {
      throw new ConfigError(`Provider not found: ${providerId}`);
    }
    this.config.activeProvider = providerId;
    await this.saveConfig();
  }

  async addProvider(provider: Omit<ProviderConfig, 'id'> & { id?: string }): Promise<string> {
    const id = provider.id || `provider-${Date.now()}`;
    const newProvider: ProviderConfig = {
      ...provider,
      id
    };

    // Check for duplicate
    if (this.config.providers.some(p => p.id === id)) {
      throw new ConfigError(`Provider with id '${id}' already exists`);
    }

    this.config.providers.push(newProvider);
    await this.saveConfig();

    return id;
  }

  async removeProvider(providerId: string): Promise<boolean> {
    const index = this.config.providers.findIndex(p => p.id === providerId);
    if (index === -1) return false;

    this.config.providers.splice(index, 1);

    if (this.config.activeProvider === providerId) {
      this.config.activeProvider = '';
    }

    await this.saveConfig();
    return true;
  }

  async setEncryptedApiKey(providerId: string, apiKey: string): Promise<void> {
    const provider = this.config.providers.find(p => p.id === providerId);
    if (!provider) {
      throw new ConfigError(`Provider not found: ${providerId}`);
    }

    // Encrypt and store in system keychain
    const serviceName = 'git-copilot';
    const account = `provider-${providerId}`;

    try {
      await keytar.setPassword(serviceName, account, apiKey);
      provider.apiKeyEncrypted = 'keytar::stored'; // Marker
      await this.saveConfig();
    } catch (error) {
      throw new ConfigError(`Failed to store API key in keytar: ${error instanceof Error ? error.message : String(error)}`, {
        providerId,
        originalError: error
      });
    }
  }

  async getDecryptedApiKey(providerId: string): Promise<string | null> {
    const provider = this.config.providers.find(p => p.id === providerId);
    if (!provider) return null;

    const serviceName = 'git-copilot';
    const account = `provider-${providerId}`;

    try {
      const apiKey = await keytar.getPassword(serviceName, account);
      return apiKey;
    } catch (error) {
      logger.error('Failed to retrieve API key from keytar', error);
      return null;
    }
  }

  async deleteStoredApiKey(providerId: string): Promise<void> {
    const serviceName = 'git-copilot';
    const account = `provider-${providerId}`;

    try {
      await keytar.deletePassword(serviceName, account);
    } catch (error) {
      logger.warn('Failed to delete API key from keytar', error);
    }
  }
}

// Singleton instance
export const configManager = ConfigManager.getInstance();
