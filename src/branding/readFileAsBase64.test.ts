import { describe, expect, it } from 'vitest';
import { readFileAsBase64 } from './readFileAsBase64';

describe('the file as base64 (portal spec 019, RN-IDA-PT-64)', () => {
  it('U·the_request_has_the_content_type_and_the_base64_data: the bytes in base64 with their padding and no data: prefix', async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff]);
    const data = await readFileAsBase64(new File([bytes], 'logo.png', { type: 'image/png' }));
    expect(data).toBe(btoa(String.fromCharCode(...bytes)));
    expect(data.startsWith('data:')).toBe(false);
    expect(data.length % 4).toBe(0);
  });

  it('a file whose length is not a multiple of three keeps its padding', async () => {
    expect(await readFileAsBase64(new File([new Uint8Array([1])], 'a', { type: 'image/png' }))).toBe('AQ==');
    expect(await readFileAsBase64(new File([new Uint8Array([1, 2])], 'a', { type: 'image/png' }))).toBe('AQI=');
  });
});
