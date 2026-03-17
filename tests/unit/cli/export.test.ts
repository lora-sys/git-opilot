import { describe, it, expect } from 'vitest';
import { program } from '../../../src/cli/index';

describe('Export Command', () => {
  it('should have export command defined', () => {
    const cmd = program.commands.find((c: any) => c.name() === 'export');
    expect(cmd).toBeDefined();
  });

  it('should have correct description', () => {
    const cmd = program.commands.find((c: any) => c.name() === 'export');
    expect(cmd?.description()).toBe('Export review report');
  });
});
