import type { AuditEvent } from './audit';

// The columns of an audit table, in order; a screen shows the ones it names (the platform screen all of them).
export const fields = ['occurredAt', 'action', 'operator', 'change', 'actor', 'reason'] as const;
// The audit of the tenant has no operator: it adds the category of the action (spec 015 section 3).
export const tenantFields = ['occurredAt', 'action', 'category', 'actor', 'reason'] as const;
export type AuditField = (typeof fields)[number] | (typeof tenantFields)[number];

// "2026-10-12T14:32:00Z" is shown as "2026-10-12 14:32 UTC".
const when = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

export const valueOf = (event: AuditEvent, field: AuditField) => (field === 'occurredAt' ? when(event.occurredAt) : event[field]);
