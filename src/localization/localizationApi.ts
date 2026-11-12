import type { ApiClient } from '../contract';
import type { TenantResponse } from '../data/tenants';

// Route of `getTenantLocalization` and `changeTenantLocalization` (identity-audit.yaml). The tenant comes from the
// token, never from the path or the body.
export const LOCALIZATION_PATH = '/api/v1/identity-audit/tenant/localization';

// The tenant with the zone and the country it has today. A read creates nothing and carries no body.
export function getLocalization(client: ApiClient, signal: AbortSignal): Promise<TenantResponse> {
  return client.request<TenantResponse>(LOCALIZATION_PATH, { method: 'GET', signal });
}
