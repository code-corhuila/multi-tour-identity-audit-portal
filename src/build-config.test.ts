import { describe, expect, it } from 'vitest';
import config from '../vite.config';

type Env = { command: 'build' | 'serve'; mode: string };
type Resolved = { define?: Record<string, string> };
const resolve = (env: Env) => (config as unknown as (e: Env) => Resolved)(env);

describe('bundle configuration', () => {
  it('replaces process.env.NODE_ENV in the build so the module runs in a browser without process', () => {
    expect(resolve({ command: 'build', mode: 'production' }).define?.['process.env.NODE_ENV']).toBe('"production"');
  });

  it('leaves it alone in the tests, where React must run in development mode', () => {
    expect(resolve({ command: 'serve', mode: 'test' }).define?.['process.env.NODE_ENV']).toBeUndefined();
  });
});