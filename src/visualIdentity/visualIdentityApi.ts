import type { ApiClient, VisualIdentity } from '../contract';
import type { TenantResponse } from '../data/tenants';

// Route of `setTenantVisualIdentity` (identity-audit.yaml). The tenant comes from the token, never from the path.
export const VISUAL_IDENTITY_PATH = '/api/v1/identity-audit/tenant/visual-identity';

// `HexColor` of the contract; the service answers with the colors in capitals.
export const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

// The body is the `VisualIdentityRequest` of the contract and the answer is the tenant (`TenantResponse`); only its
// visual identity matters here. A PUT replaces the colors and creates nothing, so it takes no Idempotency-Key.
export function setVisualIdentity(client: ApiClient, body: VisualIdentity, signal: AbortSignal): Promise<TenantResponse> {
  return client.request<TenantResponse>(VISUAL_IDENTITY_PATH, { method: 'PUT', body, signal });
}
