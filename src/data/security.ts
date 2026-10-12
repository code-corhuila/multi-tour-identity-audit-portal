import type { ApiClient } from '../contract';

export interface SignInRequest {
  email: string;
  password: string;
}

// SessionResponse of multi-tour-security openapi.yaml.
export interface SessionAnswer {
  accessToken: string;
  refreshToken?: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

// Slug pattern of the company link; also keeps '.', '..' and '/' out of the route.
export function isValidIdentifier(identifier: string): boolean {
  return /^[a-z0-9-]+$/.test(identifier);
}

// The company a person types in the general sign-in: kebab-case of 3 to 40 (`TenantIdentifier` of identity-audit.yaml).
export function isCompanyIdentifier(value: string): boolean {
  return value.length >= 3 && value.length <= 40 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);
}

// The company comes only from the link or the typed field (RN-SEC-PT-03); no identifier means the platform route.
export function signInPath(identifier?: string): string {
  const base = '/api/v1/security/public';
  if (identifier === undefined) return `${base}/platform/sessions`;
  if (!isValidIdentifier(identifier)) throw new Error('Invalid company identifier');
  return `${base}/tenants/${identifier}/sessions`;
}

export function signIn(
  client: ApiClient,
  identifier: string | undefined,
  credentials: SignInRequest,
  signal: AbortSignal,
): Promise<SessionAnswer> {
  return client.request<SessionAnswer>(signInPath(identifier), { method: 'POST', body: credentials, signal });
}

// The token of the temporary credential is attached by the container's client; the confirmation is never sent.
export function changeOwnPassword(client: ApiClient, newPassword: string, signal: AbortSignal): Promise<void> {
  return client.request<void>('/api/v1/security/sessions/password', { method: 'PUT', body: { newPassword }, signal });
}

export interface CreateCustomerRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirmation: string;
}

export function createCustomerPath(identifier: string): string {
  if (!isValidIdentifier(identifier)) throw new Error('Invalid company identifier');
  return `/api/v1/security/public/tenants/${identifier}/accounts`;
}

// 201 and 200 (a repeat of the same key) both mean the account exists; the answer carries nothing the screen needs.
export function createCustomerAccount(
  client: ApiClient,
  identifier: string,
  body: CreateCustomerRequest,
  key: string,
  signal: AbortSignal,
): Promise<void> {
  return client.request<void>(createCustomerPath(identifier), {
    method: 'POST',
    body,
    headers: { 'Idempotency-Key': key },
    signal,
  });
}
