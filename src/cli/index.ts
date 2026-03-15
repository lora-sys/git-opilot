#!/usr/bin/env node

import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import { ConfigManager } from '../config/manager.js';
import { initCommand } from './commands/init.js';
import { configCommand } from './commands/config.js';
import { reviewCommand } from './commands/review.js';

const program = new Command();

program
  .name('git-copilot')
  .description('Intelligent CLI code collaboration assistant with multi-agent parallel analysis')
  .version('0.1.0');

// Initialize command
program
  .command('init')
  .description('Initialize git-copilot configuration')
  .option('--force', 'Overwrite existing configuration')
  .action(async (options) => {
    try {
      await initCommand(options);
    } catch (error) {
      logger.error('Initialization failed', error);
      process.exit(1);
    }
  });

// Config command
program
  .command('config')
  .description('View or modify configuration')
  .option('--get <key>', 'Get configuration value')
  .option('--set <key=value>', 'Set configuration value')
  .option('--list-providers', 'List all configured providers')
  .option('--add-provider', 'Add a new LLM provider')
  .option('--remove-provider <id>', 'Remove a provider')
  .action(async (options) => {
    try {
      await configCommand(options);
    } catch (error) {
      logger.error('Config command failed', error);
      process.exit(1);
    }
  });

// Review command (basic placeholder for M1)
program
  .command('review')
  .description('Run multi-agent code review')
  .option('--since <commit>', 'Review changes since commit')
  .option('--pr <number>', 'Review PR number')
  .option('--format <format>', 'Output format: terminal, markdown, html, json')
  .action(async (options) => {
    try {
      await reviewCommand(options);
    } catch (error) {
      logger.error('Review failed', error);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
