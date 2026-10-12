import { describe, expect, it } from 'vitest';
import config from '../vite.config';

describe('bundle configuration', () => {
  it('replaces process.env.NODE_ENV so the module runs in a browser without process', () => {
    const define = (config as { define?: Record<string, string> }).define;
    expect(define?.['process.env.NODE_ENV']).toBe('"production"');
  });
});