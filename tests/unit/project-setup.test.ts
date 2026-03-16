import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { describe, it, expect, beforeAll } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('Project Configuration', () => {
  let packageJson: any

  beforeAll(() => {
    const pkgPath = join(__dirname, '..', '..', 'package.json')
    expect(existsSync(pkgPath), 'package.json should exist').toBe(true)
    packageJson = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  })

  describe('package.json structure', () => {
    it('should have required metadata fields', () => {
      expect(packageJson.name).toBe('git-copilot')
      expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(packageJson.description).toBeDefined()
      expect(packageJson.license).toBe('MIT')
    })

    it('should be an ES module (type: module)', () => {
      expect(packageJson.type).toBe('module')
    })

    it('should define CLI binary entry point', () => {
      expect(packageJson.bin).toHaveProperty('git-copilot')
      expect(typeof packageJson.bin['git-copilot']).toBe('string')
    })

    it('should have all required scripts', () => {
      const requiredScripts = [
        'build',
        'dev',
        'lint',
        'lint:fix',
        'format',
        'typecheck',
        'test',
        'test:unit',
        'test:integration',
        'test:e2e',
        'test:coverage',
      ]

      requiredScripts.forEach((script) => {
        expect(packageJson.scripts).toHaveProperty(script)
        expect(typeof packageJson.scripts[script]).toBe('string')
      })
    })

    it('should list all core runtime dependencies', () => {
      const requiredDeps = [
        'commander',
        'inquirer',
        'ink',
        'blessed',
        'react',
        'simple-git',
        'pocketflow',
        // Native dependencies deferred to M2+:
        // 'better-sqlite3',  // Beads memory (M2)
        // 'keytar',          // Encrypted API keys (M2)
        // 'yaml',            // Config YAML support (M2)
        'marked',
        'marked-terminal',
        'shiki',
        'chalk',
        'docx',
        'pdf-lib',
        'pptxgenjs',
        'exceljs',
        'uuid',
        'winston',
        'ora',
        'cli-progress',
        'axios',
      ]

      // For this test, we'll check that all non-deferred dependencies are present
      const activeDeps = requiredDeps.filter((dep) => !dep.startsWith('//'))

      activeDeps.forEach((dep) => {
        expect(packageJson.dependencies).toHaveProperty(dep)
      })
    })

    it('should have Node.js engine requirement (>=18)', () => {
      expect(packageJson.engines).toHaveProperty('node')
      expect(packageJson.engines.node).toBe('>=18.0.0')
    })

    it('should include repository and keywords', () => {
      expect(packageJson.repository).toBeDefined()
      expect(packageJson.repository.type).toBe('git')
      expect(packageJson.keywords).toContain('git')
      expect(packageJson.keywords).toContain('code-review')
      expect(packageJson.keywords).toContain('cli')
      expect(packageJson.keywords).toContain('ai')
    })

    it('should have author and files array', () => {
      expect(packageJson.author).toBeDefined()
      expect(Array.isArray(packageJson.files) || typeof packageJson.files === 'string').toBe(true)
    })
  })

  describe('devDependencies', () => {
    it('should include TypeScript and testing tools', () => {
      const requiredDevDeps = [
        'typescript',
        '@types/node',
        '@types/react',
        '@types/blessed',
        // '@types/better-sqlite3', // Deferred (native module)
        '@types/uuid',
        'eslint',
        '@typescript-eslint/eslint-plugin',
        '@typescript-eslint/parser',
        'prettier',
        'vitest',
        '@testing-library/react',
        'nock',
        'playwright',
        'husky',
        'lint-staged',
      ]

      // Filter out commented dependencies
      const activeDevDeps = requiredDevDeps.filter((dep) => !dep.startsWith('//'))

      activeDevDeps.forEach((dep) => {
        expect(packageJson.devDependencies).toHaveProperty(dep)
      })
    })
  })
})

describe('TypeScript Configuration', () => {
  it('should have tsconfig.json with strict mode', () => {
    const tsconfigPath = join(__dirname, '..', '..', 'tsconfig.json')
    expect(existsSync(tsconfigPath)).toBe(true)

    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'))

    expect(tsconfig.compilerOptions.strict).toBe(true)
    expect(tsconfig.compilerOptions.target).toBeDefined()
    expect(tsconfig.compilerOptions.module).toBeDefined()
    expect(tsconfig.compilerOptions.moduleResolution).toBeDefined()
    expect(tsconfig.compilerOptions.outDir).toBe('dist')
    expect(tsconfig.compilerOptions.rootDir).toBe('src')
    expect(tsconfig.compilerOptions.declaration).toBe(true)
    expect(tsconfig.include).toContain('src')
  })
})

describe('Linting & Formatting Configuration', () => {
  it('should have .eslintrc.json', () => {
    const eslintPath = join(__dirname, '..', '..', '.eslintrc.json')
    expect(existsSync(eslintPath)).toBe(true)

    const eslintConfig = JSON.parse(readFileSync(eslintPath, 'utf-8'))

    expect(eslintConfig.extends).toContain('eslint:recommended')
    expect(eslintConfig.extends).toContain('plugin:@typescript-eslint/recommended')
    expect(eslintConfig.extends).toContain('prettier')
    expect(eslintConfig.env).toHaveProperty('node')
    expect(eslintConfig.env).toHaveProperty('es2022')
  })

  it('should have .prettierrc', () => {
    const prettierPath = join(__dirname, '..', '..', '.prettierrc')
    expect(existsSync(prettierPath)).toBe(true)

    const prettierConfig = JSON.parse(readFileSync(prettierPath, 'utf-8'))

    expect(prettierConfig.semi).toBe(false)
    expect(prettierConfig.singleQuote).toBe(true)
    expect(prettierConfig.tabWidth).toBe(2)
    expect(prettierConfig.printWidth).toBe(120)
  })
})

describe('.gitignore', () => {
  it('should exist and include standard Node.js ignores plus project-specific', () => {
    const gitignorePath = join(__dirname, '..', '..', '.gitignore')
    expect(existsSync(gitignorePath)).toBe(true)

    const content = readFileSync(gitignorePath, 'utf-8')
    const lines = content.split('\n').filter((line) => line.trim() && !line.startsWith('#'))

    expect(lines).toContain('node_modules/')
    expect(lines).toContain('dist/')
    expect(lines).toContain('.beads/')
    expect(lines).toContain('~/.git-copilot/')
    expect(lines).toContain('coverage/')
    expect(lines).toContain('*.db')
  })
})
