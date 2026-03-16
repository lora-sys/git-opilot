import { describe, it, expect } from 'vitest'
import { program } from '../../../src/cli/index'
import packageJson from '../../../package.json' with { type: 'json' }

describe('CLI Program', () => {
  it('should have correct name and description', () => {
    expect(program.name()).toBe('git-copilot')
    expect(program.description()).toContain('Intelligent CLI')
  })

  it('should have correct version', () => {
    expect(program.version()).toBe(packageJson.version)
  })

  it('should have all required commands', () => {
    const commandNames = program.commands.map((cmd) => cmd.name())
    expect(commandNames).toContain('init')
    expect(commandNames).toContain('config')
    expect(commandNames).toContain('review')
    expect(commandNames).toContain('graph')
    expect(commandNames).toContain('dashboard')
    expect(commandNames).toContain('export')
    expect(commandNames).toContain('skills')
  })

  it('should have command descriptions', () => {
    const getCommand = (name: string) => program.commands.find((c) => c.name() === name)

    expect(getCommand('init')?.description()).toBe('Initialize git-copilot configuration')
    expect(getCommand('config')?.description()).toBe('Manage configuration')
    expect(getCommand('review')?.description()).toBe('Perform code review')
    expect(getCommand('graph')?.description()).toBe('Visualize commit graph')
    expect(getCommand('dashboard')?.description()).toBe('Show review dashboard')
    expect(getCommand('export')?.description()).toBe('Export review report')
    expect(getCommand('skills')?.description()).toBe('Manage Claude Skills')
  })

  it('should have help and version options', () => {
    // Commander automatically adds -h, --help, -V, --version
    // We can verify they're present by checking that the help output includes them
    const helpOutput = program.helpInformation()
    expect(helpOutput).toContain('--help')
    expect(helpOutput).toContain('--version')
    expect(helpOutput).toContain('Usage:')
    expect(helpOutput).toContain('git-copilot')
  })
})
