#!/usr/bin/env node

import { Command } from 'commander'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import { registerExportCommand } from './commands/export.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Get version from package.json
const pkgPath = join(__dirname, '..', '..', 'package.json')
const packageJson = JSON.parse(readFileSync(pkgPath, 'utf-8'))

export const program = new Command()

program
  .name('git-copilot')
  .description('Intelligent CLI code collaboration assistant for Git repositories')
  .version(packageJson.version)

// init command
program
  .command('init')
  .description('Initialize git-copilot configuration')
  .action(() => {
    console.log('Initializing git-copilot... (Not yet implemented)')
  })

// config command
program
  .command('config')
  .description('Manage configuration')
  .option('-l, --list', 'List all providers')
  .option('-a, --add <name>', 'Add a new provider')
  .option('-r, --remove <name>', 'Remove a provider')
  .option('-s, --set-active <name>', 'Set active provider')
  .action(() => {
    console.log('Managing configuration... (Not yet implemented)')
  })

// review command
program
  .command('review')
  .description('Perform code review')
  .option('-r, --range <range>', 'Commit range to review (e.g., HEAD~3..HEAD)')
  .option('-o, --output <format>', 'Output format: terminal, md, html, docx, pdf, pptx, xlsx, json')
  .option('-f, --file <path>', 'Output to file')
  .action(() => {
    console.log('Starting code review... (Not yet implemented)')
  })

// graph command
program
  .command('graph')
  .description('Visualize commit graph')
  .option('-l, --limit <n>', 'Limit number of commits', '50')
  .action(() => {
    console.log('Displaying commit graph... (Not yet implemented)')
  })

// dashboard command
program
  .command('dashboard')
  .description('Show review dashboard')
  .action(() => {
    console.log('Opening dashboard... (Not yet implemented)')
  })

// export command
registerExportCommand(program)

// skills command
program
  .command('skills')
  .description('Manage Claude Skills')
  .option('-l, --list', 'List available skills')
  .option('-i, --install <path>', 'Install custom skill from path')
  .option('-u, --update', 'Update built-in skills')
  .action(() => {
    console.log('Managing skills... (Not yet implemented)')
  })

// Only parse if this module is the main entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse()
}
