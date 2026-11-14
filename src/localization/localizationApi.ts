import type { ApiClient } from '../contract';
import type { TenantResponse } from '../data/tenants';

// Route of `getTenantLocalization` and `changeTenantLocalization` (identity-audit.yaml). The tenant comes from the
// token, never from the path or the body.
export const LOCALIZATION_PATH = '/api/v1/identity-audit/tenant/localization';

// The tenant with the zone and the country it has today. A read creates nothing and carries no body.
export function getLocalization(client: ApiClient, signal: AbortSignal): Promise<TenantResponse> {
  return client.request<TenantResponse>(LOCALIZATION_PATH, { method: 'GET', signal });
}

// The body is the `LocalizationRequest` of the contract: only what changes, at least one of the two. The answer is the
// tenant with what it has now. A PUT creates nothing, so it takes no Idempotency-Key.
export interface LocalizationChange {
  timeZone?: string;
  country?: string;
}

export function changeLocalization(client: ApiClient, body: LocalizationChange, signal: AbortSignal): Promise<TenantResponse> {
  return client.request<TenantResponse>(LOCALIZATION_PATH, { method: 'PUT', body, signal });
}
