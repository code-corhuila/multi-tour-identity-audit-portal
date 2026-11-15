// @vitest-environment node
// The bundle is built in memory and read as text: the stub module must not be part of it.
import { build } from 'vite';
import { describe, expect, it } from 'vitest';

async function builtCode() {
  const result = await build({ logLevel: 'silent', build: { write: false } });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap((r) => ('output' in r ? r.output : []));
  const code = outputs.map((o) => ('code' in o ? o.code : '')).join('\n');
  expect(code.length).toBeGreaterThan(0);
  return code;
}

describe('production build (RN-CAL-PLT-07)', () => {
  it('B·test_data_is_not_in_the_production_build', async () => {
    expect(await builtCode()).not.toContain('TEST-DATA-NOT-FOR-PRODUCTION');
  }, 120_000);

  // Spec 014 RN-IDA-PT-28: the three invented rows of the audit screen are gone from the screen and from the build.
  it('B·audit_test_data_is_not_in_the_build', async () => {
    const code = await builtCode();
    for (const invented of ['Alta aprobada por el comité', 'Documentación al día', 'Solicitud del operador']) {
      expect(code, invented).not.toContain(invented);
    }
  }, 120_000);
});
