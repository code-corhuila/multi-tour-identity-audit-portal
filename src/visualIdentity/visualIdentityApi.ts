import type { ApiClient, VisualIdentity } from '../contract';

// Route of `setTenantVisualIdentity` (identity-audit.yaml). The tenant comes from the token, never from the path.
export const VISUAL_IDENTITY_PATH = '/api/v1/identity-audit/tenant/visual-identity';

// `HexColor` of the contract; the service answers with the colors in capitals.
export const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

// The answer is the tenant; only its visual identity matters here.
export interface VisualIdentityAnswer {
  visualIdentity?: VisualIdentity | null;
}

// A PUT replaces the colors and creates nothing, so it takes no Idempotency-Key.
export function setVisualIdentity(client: ApiClient, body: VisualIdentity, signal: AbortSignal): Promise<VisualIdentityAnswer> {
  return client.request<VisualIdentityAnswer>(VISUAL_IDENTITY_PATH, { method: 'PUT', body, signal });
}
