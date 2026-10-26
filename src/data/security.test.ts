import { describe, expect, it, vi } from 'vitest';
import {
  createCustomerAccount,
  createCustomerPath,
  isValidIdentifier,
  requestEmailVerification,
  requestEmailVerificationPath,
  signInPath,
} from './security';

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

describe('createCustomerAccount', () => {
  const body = {
    firstName: 'A',
    lastName: 'B',
    email: 'a@b.co',
    phone: '3001234567',
    password: 'Viaje-2026!',
    passwordConfirmation: 'Viaje-2026!',
  };

  it('posts to the tenant accounts route with the Idempotency-Key header', async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    const signal = new AbortController().signal;
    await createCustomerAccount({ request }, 'acme', body, 'key-12345678', signal);
    expect(request).toHaveBeenCalledWith('/api/v1/security/public/tenants/acme/accounts', {
      method: 'POST',
      body,
      headers: { 'Idempotency-Key': 'key-12345678' },
      signal,
    });
  });

  it.each(['', '.', '..', 'Acme', 'a/b'])('never builds a route for the invalid identifier "%s"', (id) => {
    expect(() => createCustomerPath(id)).toThrow();
  });
});

describe('requestEmailVerification', () => {
  it('posts only the e-mail to the tenant e-mail-verifications route, with no Idempotency-Key', async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    const signal = new AbortController().signal;
    await requestEmailVerification({ request }, 'acme', 'a@b.co', signal);
    expect(request).toHaveBeenCalledWith('/api/v1/security/public/tenants/acme/email-verifications', {
      method: 'POST',
      body: { email: 'a@b.co' },
      signal,
    });
  });

  it.each(['', '.', '..', 'Acme', 'a/b'])('never builds a route for the invalid identifier "%s"', (id) => {
    expect(() => requestEmailVerificationPath(id)).toThrow();
  });
});
