import type { ApiClient } from '../contract';

// Names and values of `TenantResponse` and `TenantStatus` in identity-audit.yaml.
export type TenantStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'FAILED';

export interface TenantResponse {
  tenantId: string;
  identifier: string;
  commercialName: string;
  tenantStatus: TenantStatus;
  timeZone: string;
  country: string;
  firstAdministratorMembershipId?: string | null;
  statusChangedAt?: string | null;
  statusChangedBy?: string | null;
  statusReason?: string | null;
  failedStep?: 'CREATE_ACCOUNT' | 'APPLY_STATUS' | null;
  createdAt: string;
}

// `PaginatedMeta` of _shared.yaml.
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TenantPage {
  data: TenantResponse[];
  meta: PageMeta;
}

export interface TenantQuery {
  page: number;
  limit: number;
  status?: TenantStatus;
}

export const tenantStatuses: TenantStatus[] = ['PENDING', 'ACTIVE', 'INACTIVE', 'FAILED'];

// Relative path: the container's client adds the gateway (RN-IDA-PT-08).
export function tenantsPath({ page, limit, status }: TenantQuery): string {
  const query = `page=${page}&limit=${limit}`;
  return `/api/v1/identity-audit/tenants?${query}${status ? `&status=${status}` : ''}`;
}

export function listTenants(client: ApiClient, query: TenantQuery, signal: AbortSignal): Promise<TenantPage> {
  return client.request<TenantPage>(tenantsPath(query), { signal });
}

const tenantPath = (tenantId: string) => `/api/v1/identity-audit/tenants/${encodeURIComponent(tenantId)}`;

export function getTenant(client: ApiClient, tenantId: string, signal: AbortSignal): Promise<TenantResponse> {
  return client.request<TenantResponse>(tenantPath(tenantId), { signal });
}

// Inactivating cuts the tenant's sessions; the reason is required (1 to 500 characters, `TransitionReasonRequest`).
export function inactivateTenant(client: ApiClient, tenantId: string, reason: string, signal?: AbortSignal): Promise<TenantResponse> {
  return client.request<TenantResponse>(`${tenantPath(tenantId)}/inactivate`, { method: 'POST', body: { reason }, signal });
}
