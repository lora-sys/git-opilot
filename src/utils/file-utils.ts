import { existsSync, mkdir, readFile, writeFile, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { FileSystemError } from './errors';

export async function ensureDir(path: string): Promise<void> {
  try {
    await mkdir(path, { recursive: true });
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as any).code !== 'EEXIST') {
      throw new FileSystemError(`Failed to create directory: ${path}`, { originalError: error });
    }
  }
}

export async function readJsonFile<T = unknown>(path: string): Promise<T> {
  try {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    throw new FileSystemError(`Failed to read JSON file: ${path}`, { originalError: error });
  }
}

export async function writeJsonFile<T>(path: string, data: T, spaces: number = 2): Promise<void> {
  try {
    const dir = dirname(path);
    await ensureDir(dir);
    await writeFile(path, JSON.stringify(data, null, spaces), 'utf-8');
  } catch (error) {
    throw new FileSystemError(`Failed to write JSON file: ${path}`, { originalError: error });
  }
}

export async function readYamlFile<T = unknown>(path: string): Promise<T> {
  try {
    const yaml = await import('yaml');
    const content = await readFile(path, 'utf-8');
    return yaml.parse(content) as T;
  } catch (error) {
    throw new FileSystemError(`Failed to read YAML file: ${path}`, { originalError: error });
  }
}

export async function writeYamlFile<T>(path: string, data: T): Promise<void> {
  try {
    const yaml = await import('yaml');
    const dir = dirname(path);
    await ensureDir(dir);
    await writeFile(path, yaml.stringify(data), 'utf-8');
  } catch (error) {
    throw new FileSystemError(`Failed to write YAML file: ${path}`, { originalError: error });
  }
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await mkdir(dirname(path), { recursive: true });
    return existsSync(path);
  } catch {
    return false;
  }
}

export function getHomeDir(): string {
  return process.env.HOME || process.env.USERPROFILE || '/';
}

export function getConfigDir(): string {
  const home = getHomeDir();
  return join(home, '.git-copilot');
}

export function getConfigPath(): string {
  return join(getConfigDir(), 'config.yaml');
}
