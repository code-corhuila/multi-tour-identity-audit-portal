import { afterEach, describe, expect, it } from 'vitest';
import { readLinkToken } from './linkToken';

const TOKEN = 'A'.repeat(21) + '-_' + 'b'.repeat(20);

afterEach(() => window.history.replaceState(null, '', '/'));

describe('readLinkToken', () => {
  it('the_link_is_read_and_removed_from_the_address: returns the value after #token= and leaves the path', () => {
    window.history.replaceState(null, '', `/t/acme/verificar-correo#token=${TOKEN}`);
    expect(readLinkToken()).toBe(TOKEN);
    expect(window.location.hash).toBe('');
    expect(window.location.pathname).toBe('/t/acme/verificar-correo');
    expect(window.location.href).not.toContain(TOKEN);
  });

  it.each([
    ['no fragment', ''],
    ['another fragment', '#otra-cosa'],
    ['an empty value', '#token='],
    ['a value that is too short', '#token=abc'],
    ['a value with characters outside base64url', `#token=${'+'.repeat(43)}`],
    ['a value that is too long', `#token=${'a'.repeat(44)}`],
  ])('a_page_without_a_link_offers_a_new_one: %s gives no link', (_name, hash) => {
    window.history.replaceState(null, '', `/t/acme/verificar-correo${hash}`);
    expect(readLinkToken()).toBeUndefined();
  });

  it('removes a fragment that carries a malformed value too, so nothing odd stays in the history', () => {
    window.history.replaceState(null, '', '/t/acme/verificar-correo#token=abc');
    readLinkToken();
    expect(window.location.hash).toBe('');
  });
});
