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