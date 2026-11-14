import type { ApiClient } from '../contract';

// Names of `AuditAccessResponse` in identity-audit.yaml. The roles are the optional ones of the tenant.
export type OptionalRole = 'MANAGER' | 'ACCOUNTANT' | 'ANALYST';

export interface AuditAccess {
  role: OptionalRole;
  enabled: boolean;
  changedBy?: string | null;
  changedAt?: string | null;
}

const PATH = '/api/v1/identity-audit/tenant/audit-access';

// Always the three roles; a role never set is `enabled: false`. Only the Tenant Administrator may ask.
export async function listAuditAccess(client: ApiClient, signal: AbortSignal): Promise<AuditAccess[]> {
  return (await client.request<{ data: AuditAccess[] }>(PATH, { signal })).data;
}

// A PUT of a setting creates nothing, so it takes no Idempotency-Key; the tenant comes from the token, never from here.
export function setAuditAccess(client: ApiClient, role: OptionalRole, enabled: boolean, signal: AbortSignal): Promise<AuditAccess> {
  return client.request<AuditAccess>(`${PATH}/${role}`, { method: 'PUT', body: { enabled }, signal });
}
