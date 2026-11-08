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

// The company comes only from the link (RN-SEC-PT-03); no identifier means the platform route.
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

export function requestEmailVerificationPath(identifier: string): string {
  if (!isValidIdentifier(identifier)) throw new Error('Invalid company identifier');
  return `/api/v1/security/public/tenants/${identifier}/email-verifications`;
}

// Always 202 and no body, whatever the e-mail (RN-SEC-004-06); the route takes no Idempotency-Key.
export function requestEmailVerification(client: ApiClient, identifier: string, email: string, signal: AbortSignal): Promise<void> {
  return client.request<void>(requestEmailVerificationPath(identifier), { method: 'POST', body: { email }, signal });
}

export function confirmEmailVerificationPath(identifier: string): string {
  return `${requestEmailVerificationPath(identifier)}/confirmations`;
}

// The link and the password of the account; no Idempotency-Key, a link works once.
export function confirmEmailVerification(client: ApiClient, identifier: string, token: string, password: string, signal: AbortSignal): Promise<void> {
  return client.request<void>(confirmEmailVerificationPath(identifier), { method: 'POST', body: { token, password }, signal });
}

// The routes of the password recovery (HU-SEC-004): the company of the link, or the platform when there is none.
export function passwordRecoveryPath(identifier: string | undefined): string {
  if (identifier === undefined) return '/api/v1/security/public/platform/password-recoveries';
  if (!isValidIdentifier(identifier)) throw new Error('Invalid company identifier');
  return `/api/v1/security/public/tenants/${identifier}/password-recoveries`;
}

// Always 202 and no body, whatever the e-mail (RN-SEC-006-01); the route takes no Idempotency-Key.
export function requestPasswordRecovery(client: ApiClient, identifier: string | undefined, email: string, signal: AbortSignal): Promise<void> {
  return client.request<void>(passwordRecoveryPath(identifier), { method: 'POST', body: { email }, signal });
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
  newPasswordConfirmation: string;
}

// The code and the passwords go in the body and nowhere else; no Idempotency-Key, a code works once.
export function resetPassword(client: ApiClient, identifier: string | undefined, body: ResetPasswordRequest, signal: AbortSignal): Promise<void> {
  return client.request<void>(`${passwordRecoveryPath(identifier)}/resets`, { method: 'POST', body, signal });
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
