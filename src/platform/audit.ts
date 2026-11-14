import type { AuditRecordResponse } from '../data/audit';
import { tenantMessages } from '../tenants/messages';
import { auditMessages as text } from './auditMessages';

// What the screen shows of one audited action (spec 014 section 3). `toAuditEvent` is the only place that makes it, so the
// day the service names its columns differently only this file and the data file change.
export interface AuditEvent {
  id: string;
  // RFC 3339 in UTC.
  occurredAt: string;
  action: string;
  operator: string;
  change: string;
  actor: string;
  reason: string;
  // The extended part of the record, for the detail (HU-IDA-002 AC2); a dash when the record holds none.
  affectedRecord: string;
  previousValue: string;
  newValue: string;
  channelOrModule: string;
  functionalReference: string;
}

const statusName = (value: unknown) => (typeof value === 'string' && Object.hasOwn(tenantMessages.statuses, value) ? tenantMessages.statuses[value as keyof typeof tenantMessages.statuses] : undefined);

// "Activo → Inactivo" when the record holds the status of the tenant before and after; a dash otherwise, never a guess.
function change(record: AuditRecordResponse): string {
  const before = statusName(record.previousValue?.tenantStatus);
  const after = statusName(record.newValue?.tenantStatus);
  return before && after ? `${before} → ${after}` : text.none;
}

const printed = (value: Record<string, unknown> | null | undefined) => (value ? JSON.stringify(value, null, 2) : text.none);

// What the screen shows of one record (spec 014 section 3). `operatorNames` maps the identifier of a tenant to its
// commercial name; a tenant that is not in it shows its identifier, and a record with no tenant shows the platform.
export function toAuditEvent(record: AuditRecordResponse, operatorNames: ReadonlyMap<string, string>): AuditEvent {
  return {
    id: record.auditRecordId,
    occurredAt: record.recordedAt,
    action: Object.hasOwn(text.actions, record.action) ? text.actions[record.action] : record.action,
    operator: record.tenantId === null ? text.platform : (operatorNames.get(record.tenantId) || record.tenantId),
    change: change(record),
    actor: record.actorId,
    reason: record.reason || text.none,
    affectedRecord: record.affectedRecordId,
    previousValue: printed(record.previousValue),
    newValue: printed(record.newValue),
    channelOrModule: record.channelOrModule || text.none,
    functionalReference: record.functionalProcessReference || text.none,
  };
}

// The start of a day chosen in a date control, in UTC, or nothing when it is no day: empty, a year of five digits (the service
// would answer 400) or a date that does not exist, which Date.parse would roll over to another one (2026-02-30 to 2026-03-02).
const dayStart = (day: string): number | undefined => {
  const start = Date.parse(`${day}T00:00:00Z`);
  return Number.isNaN(start) || !new Date(start).toISOString().startsWith(day) ? undefined : start;
};

export function startOfDay(day: string): string | undefined {
  return dayStart(day) === undefined ? undefined : `${day}T00:00:00Z`;
}

// The end of a period chosen as a day. The service takes `to` exclusive, so the last day chosen is asked up to the start of the next
// one, in UTC; built from the text of the day, never through a local time, so the zone of the browser changes nothing.
export function endOfDay(day: string): string | undefined {
  const start = dayStart(day);
  return start === undefined ? undefined : `${new Date(start + 86_400_000).toISOString().slice(0, 19)}Z`;
}
