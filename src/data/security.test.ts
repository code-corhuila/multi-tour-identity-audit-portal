import { describe, expect, it } from 'vitest';
import { isValidIdentifier, signInPath } from './security';

describe('identifier of the link', () => {
  it.each(['acme', 'acme-tours', 'a1', 'x-9'])('identifier_valid: %s', (id) => {
    expect(isValidIdentifier(id)).toBe(true);
  });

  it.each(['', '.', '..', 'Acme', 'a b', 'ac/me', 'ac.me'])('identifier_invalid: "%s"', (id) => {
    expect(isValidIdentifier(id)).toBe(false);
  });

  it('signInPath builds the platform route only when there is no identifier', () => {
    expect(signInPath(undefined)).toBe('/api/v1/security/public/platform/sessions');
    expect(signInPath('acme')).toBe('/api/v1/security/public/tenants/acme/sessions');
  });

  it.each(['', '.', '..', 'Acme', 'a b'])('signInPath never builds a route for the invalid identifier "%s"', (id) => {
    expect(() => signInPath(id)).toThrow();
  });
});
