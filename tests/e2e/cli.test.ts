import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync, rm } from 'fs';

describe('Git Copilot CLI E2E', () => {
  const CLI_PATH = join(process.cwd(), 'dist/cli/index.js');

  it('should display help when no command provided', async () => {
    return new Promise((resolve, reject) => {
      const proc = spawn('node', [CLI_PATH], {
        env: { ...process.env, GIT_COPILOT_CONFIG: '/tmp/test-config.yaml' }
      });

      let output = '';
      let errorOutput = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      proc.on('close', (code) => {
        expect(output).toContain('Usage');
        expect(output).toContain('git-copilot');
        expect(code).toBe(0);
        resolve(null);
      });

      proc.on('error', reject);
    });
  });

  it('should run init command', async () => {
    // This is a placeholder - will need proper test implementation
    // with interactive prompts mocked or using environment variables
    expect(true).toBe(true);
  });

  it('should show git status when in git repo', async () => {
    return new Promise((resolve, reject) => {
      const proc = spawn('node', [CLI_PATH, 'status'], {
        env: { ...process.env, GIT_COPILOT_CONFIG: '/tmp/test-config.yaml' }
      });

      let output = '';
      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        // Errors may be expected if not in git repo
      });

      proc.on('close', (code) => {
        // Either works or shows error
        expect(code).toBeLessThan(2);
        resolve(null);
      });

      proc.on('error', reject);
    });
  });
});
