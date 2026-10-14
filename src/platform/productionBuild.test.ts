// @vitest-environment node
// The bundle is built in memory and read as text: the stub module must not be part of it.
import { build } from 'vite';
import { describe, expect, it } from 'vitest';

describe('production build (RN-CAL-PLT-07)', () => {
  it('B·test_data_is_not_in_the_production_build', async () => {
    const result = await build({ logLevel: 'silent', build: { write: false } });
    const outputs = (Array.isArray(result) ? result : [result]).flatMap((r) => ('output' in r ? r.output : []));
    const code = outputs.map((o) => ('code' in o ? o.code : '')).join('\n');
    expect(code.length).toBeGreaterThan(0);
    expect(code).not.toContain('TEST-DATA-NOT-FOR-PRODUCTION');
  }, 120_000);
});
