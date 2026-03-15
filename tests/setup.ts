// Test setup file
import { beforeAll, afterAll, afterEach } from 'vitest';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const TEST_CONFIG_DIR = join(process.env.HOME || '/tmp', '.git-copilot-test');

beforeAll(async () => {
  // Create test config directory
  if (!existsSync(TEST_CONFIG_DIR)) {
    await mkdir(TEST_CONFIG_DIR, { recursive: true });
  }
  process.env.GIT_COPILOT_CONFIG = join(TEST_CONFIG_DIR, 'config.yaml');
});

afterEach(async () => {
  // Cleanup test files if needed
});

afterAll(async () => {
  // Remove test config directory
  if (existsSync(TEST_CONFIG_DIR)) {
    await rm(TEST_CONFIG_DIR, { recursive: true, force: true });
  }
});
