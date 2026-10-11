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

// The company comes only from the link (RN-SEC-PT-03); no identifier means the platform route.
export function signInPath(identifier?: string): string {
  const base = '/api/v1/security/public';
  return identifier ? `${base}/tenants/${encodeURIComponent(identifier)}/sessions` : `${base}/platform/sessions`;
}

export function signIn(
  client: ApiClient,
  identifier: string | undefined,
  credentials: SignInRequest,
  signal: AbortSignal,
): Promise<SessionAnswer> {
  return client.request<SessionAnswer>(signInPath(identifier), { method: 'POST', body: credentials, signal });
}