import inquirer from 'inquirer';
import { ConfigManager } from '../../config/manager.js';
import { GitCollector } from '../../git/collector.js';
import { logger } from '../../utils/logger.js';
import { ConfigError } from '../../utils/errors.js';

export async function initCommand(options: { force?: boolean }): Promise<void> {
  logger.info('🚀 Initializing git-copilot...');

  const configManager = ConfigManager.getInstance();
  const config = configManager.getConfig();

  // Check if config already exists
  if (Object.keys(config.providers).length > 0 && !options.force) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'Configuration already exists. Overwrite?',
        default: false
      }
    ]);

    if (!overwrite) {
      logger.info('Initialization cancelled.');
      return;
    }
  }

  try {
    // Check if we're in a git repository
    const collector = new GitCollector();
    const isGitRepo = await collector.isGitRepository();

    if (!isGitRepo) {
      logger.warn('Not in a git repository. Configuration will be saved, but some features may not work.');
      const { continueAnyway } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continueAnyway',
          message: 'Continue anyway?',
          default: false
        }
      ]);

      if (!continueAnyway) {
        logger.info('Initialization cancelled.');
        return;
      }
    } else {
      const status = await collector.getStatus();
      logger.info(`📊 Detected repository: ${status.branch} branch`);
      logger.info(`   Commits: ${status.commits.length}, Changed files: ${status.changedFiles.length}`);
    }

    // Provider selection
    const { providerType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'providerType',
        message: 'Select your LLM provider:',
        choices: [
          { name: 'OpenAI (GPT-4, GPT-3.5)', value: 'openai' },
          { name: 'Anthropic Claude (Claude Sonnet, Opus)', value: 'anthropic' },
          { name: 'Ollama (Local, Free)', value: 'ollama' },
          { name: 'DeepSeek (high-quality, cost-effective)', value: 'deepseek' },
          { name: 'Custom', value: 'custom' }
        ]
      }
    ]);

    let providerId: string;

    if (providerType === 'custom') {
      const { customName } = await inquirer.prompt([
        {
          type: 'input',
          name: 'customName',
          message: 'Provider name:',
          validate: (input) => input.length > 0 || 'Provider name is required'
        }
      ]);
      providerId = customName;
    } else {
      providerId = providerType;
    }

    // API Key input
    const { apiKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your API key (will be stored securely in system keychain):',
        validate: (input) => input.length > 0 || 'API key is required'
      }
    ]);

    // Save provider
    await configManager.addProvider({
      id: providerId,
      name: providerType,
      baseUrl: getDefaultBaseUrl(providerType),
      apiKeyEncrypted: 'pending_keytar', // Placeholder, real key stored separately
      model: getDefaultModel(providerType),
      maxTokens: 4096
    });

    // Store API key in keychain
    await configManager.setEncryptedApiKey(providerId, apiKey);
    await configManager.setActiveProvider(providerId);

    logger.success(`✅ Provider ${providerId} configured!`);

    // Additional options
    const { enableAnalytics, language } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'enableAnalytics',
        message: 'Enable usage analytics (anonymized, local-only)?',
        default: false
      },
      {
        type: 'list',
        name: 'language',
        message: 'Select interface language:',
        choices: [
          { name: '中文 (Simplified Chinese)', value: 'zh' },
          { name: 'English', value: 'en' }
        ],
        default: 'zh'
      }
    ]);

    // Update config with language
    config.ui.language = language;
    config.ui.animations = true;
    await configManager.saveConfig();

    // Summary
    logger.infoBox(
      'Configuration Complete',
      `
Provider: ${providerId}
Model: ${getDefaultModel(providerType)}
Language: ${language === 'zh' ? '中文' : 'English'}
Config location: ${process.env.GIT_COPILOT_CONFIG || '~/.git-copilot/config.yaml'}
      `.trim()
    );

    logger.success('🎉 Initialization complete! Run "git-copilot review" to start reviewing.');

  } catch (error) {
    throw new ConfigError(`Failed to initialize: ${error instanceof Error ? error.message : String(error)}`, {
      originalError: error
    });
  }
}

function getDefaultBaseUrl(provider: string): string {
  const urls: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com',
    ollama: 'http://localhost:11434',
    deepseek: 'https://api.deepseek.com/v1'
  };
  return urls[provider] || 'https://api.example.com';
}

function getDefaultModel(provider: string): string {
  const models: Record<string, string> = {
    openai: 'gpt-4o',
    anthropic: 'claude-sonnet-4-20250514',
    ollama: 'llama3.2',
    deepseek: 'deepseek-coder'
  };
  return models[provider] || 'default-model';
}
