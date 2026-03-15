import inquirer from 'inquirer';
import { ConfigManager } from '../../config/manager.js';
import { logger } from '../../utils/logger.js';

export async function configCommand(options: {
  get?: string;
  set?: string;
  listProviders?: boolean;
  addProvider?: boolean;
  removeProvider?: string;
}): Promise<void> {
  const configManager = ConfigManager.getInstance();
  const config = configManager.getConfig();

  // List providers
  if (options.listProviders) {
    console.log('\n📋 Configured Providers:');
    console.log('─'.repeat(60));

    if (config.providers.length === 0) {
      console.log('No providers configured. Run "git-copilot init" to set up.');
    } else {
      for (const provider of config.providers) {
        const active = provider.id === config.activeProvider ? '✓' : ' ';
        console.log(`${active} ${provider.id.padEnd(20)} ${provider.name} (${provider.model})`);
      }
    }
    console.log('');
    return;
  }

  // Get specific config value
  if (options.get) {
    const value = getConfigValue(config, options.get);
    if (value !== undefined) {
      console.log(JSON.stringify(value, null, 2));
    } else {
      console.log(`Configuration key '${options.get}' not found.`);
    }
    return;
  }

  // Set config value
  if (options.set) {
    const [key, value] = options.set.split('=');
    if (!key || value === undefined) {
      logger.error('Invalid format. Use: --set key=value');
      process.exit(1);
    }

    await setConfigValue(configManager, config, key.trim(), value.trim());
    logger.success(`✅ Set ${key} = ${value}`);
    return;
  }

  // Add provider
  if (options.addProvider) {
    await addProviderInteractive(configManager);
    return;
  }

  // Remove provider
  if (options.removeProvider) {
    await configManager.removeProvider(options.removeProvider);
    logger.success(`✅ Removed provider: ${options.removeProvider}`);
    return;
  }

  // Default: show current configuration
  await showConfig(configManager, config);
}

async function showConfig(configManager: ConfigManager, config: any): Promise<void> {
  console.log('\n⚙️  Git Copilot Configuration');
  console.log('═'.repeat(60));

  // Active provider
  const activeProvider = config.providers.find(p => p.id === config.activeProvider);
  console.log(`Active Provider: ${activeProvider?.name || 'none'} (${config.activeProvider})`);

  // Review settings
  console.log('\nReview Settings:');
  console.log(`  Concurrent Agents: ${config.review.concurrentAgents}`);
  console.log(`  Timeout: ${config.review.timeout}s`);
  console.log(`  Max Files: ${config.review.maxFiles}`);
  console.log(`  Ignore Patterns: ${config.review.ignore.join(', ')}`);

  // Output settings
  console.log('\nOutput Settings:');
  console.log(`  Format: ${config.output.format}`);
  console.log(`  Directory: ${config.output.directory}`);
  if (config.output.theme) {
    console.log(`  Theme: ${config.output.theme}`);
  }

  // UI settings
  console.log('\nUser Interface:');
  console.log(`  Theme: ${config.ui.theme}`);
  console.log(`  Colors: ${config.ui.colors ? 'enabled' : 'disabled'}`);
  console.log(`  Animations: ${config.ui.animations ? 'enabled' : 'disabled'}`);
  console.log(`  Language: ${config.ui.language === 'zh' ? '中文' : 'English'}`);

  // Skills
  console.log('\nSkills:');
  console.log(`  Built-in: ${config.skills.builtin.length} loaded`);
  console.log(`  Custom paths: ${config.skills.paths.length} configured`);

  // Beads
  console.log('\nBeads Memory:');
  console.log(`  Max Context Tokens: ${config.beads.maxContextTokens}`);
  console.log(`  Retention Days: ${config.beads.longTermRetentionDays}`);
  console.log(`  Cross-agent Sharing: ${config.beads.crossAgentSharing ? 'enabled' : 'disabled'}`);
  console.log(`  Semantic Threshold: ${config.beads.semanticSearchThreshold}`);

  // Config location
  console.log('\n' + '─'.repeat(60));
  console.log(`Config: ${process.env.GIT_COPILOT_CONFIG || '~/.git-copilot/config.yaml'}`);
  console.log('');
}

async function addProviderInteractive(configManager: ConfigManager): Promise<void> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'id',
      message: 'Provider ID (e.g., "my-openai"):',
      validate: (input) => input.length > 0 && /^[a-z0-9-]+$/.test(input) || 'Use lowercase letters, numbers, and hyphens only'
    },
    {
      type: 'input',
      name: 'name',
      message: 'Provider name:',
      validate: (input) => input.length > 0 || 'Provider name is required'
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: 'API Base URL:',
      default: 'https://api.example.com/v1'
    },
    {
      type: 'input',
      name: 'model',
      message: 'Default model:',
      validate: (input) => input.length > 0 || 'Model name is required'
    },
    {
      type: 'number',
      name: 'maxTokens',
      message: 'Max tokens:',
      default: 4096
    },
    {
      type: 'password',
      name: 'apiKey',
      message: 'API Key:',
      validate: (input) => input.length > 0 || 'API key is required'
    }
  ]);

  await configManager.addProvider({
    id: answers.id,
    name: answers.name,
    baseUrl: answers.baseUrl,
    apiKeyEncrypted: 'pending_keytar',
    model: answers.model,
    maxTokens: answers.maxTokens
  });

  await configManager.setEncryptedApiKey(answers.id, answers.apiKey);
  logger.success(`✅ Provider '${answers.id}' added successfully!`);
}

async function setConfigValue(
  configManager: ConfigManager,
  config: any,
  key: string,
  value: string
): Promise<void> {
  const keys = key.split('.');
  let current: any = config;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }

  const lastKey = keys[keys.length - 1];

  // Type conversion
  if (value === 'true') value = 'true';
  if (value === 'false') value = 'false';
  if (!isNaN(Number(value))) value = Number(value);

  current[lastKey] = value;
  await configManager.saveConfig();
}

function getConfigValue(config: any, key: string): any {
  const keys = key.split('.');
  let current: any = config;

  for (const k of keys) {
    if (!current) return undefined;
    current = current[k];
  }

  return current;
}
