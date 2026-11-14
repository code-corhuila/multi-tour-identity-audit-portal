import type { ApiClient } from '../contract';
import type { PageMeta } from './tenants';

// Names of `AuditRecordResponse` and `AuditRecordPage` in identity-audit.yaml.
export interface AuditRecordResponse {
  auditRecordId: string;
  // Null for an action of the platform, which belongs to no tenant.
  tenantId: string | null;
  actorId: string;
  // The type of the event in SCREAMING_SNAKE_CASE; a publisher that is new may bring one the screen does not know.
  action: string;
  affectedRecordId: string;
  reason?: string | null;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  channelOrModule?: string | null;
  functionalProcessReference?: string | null;
  // RFC 3339 in UTC.
  recordedAt: string;
}

export interface AuditPage {
  data: AuditRecordResponse[];
  meta: PageMeta;
}

export interface AuditQuery {
  page: number;
  limit: number;
  tenantId?: string;
  action?: string;
  // RFC 3339 in UTC; `from` is inclusive and `to` exclusive.
  from?: string;
  to?: string;
}

// Relative path: the container's client adds the gateway (RN-IDA-PT-08). A filter that is empty is left out, because the
// service answers 400 to an empty action and the screen means "all" by not choosing one.
export function auditPath({ page, limit, tenantId, action, from, to }: AuditQuery): string {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (tenantId) query.set('tenantId', tenantId);
  if (action) query.set('action', action);
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  return `/api/v1/identity-audit/audit-records?${query}`;
}

export function listAuditRecords(client: ApiClient, query: AuditQuery, signal: AbortSignal): Promise<AuditPage> {
  return client.request<AuditPage>(auditPath(query), { signal });
}
