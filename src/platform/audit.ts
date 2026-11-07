import type { AuditRecordResponse } from '../data/audit';
import { tenantMessages } from '../tenants/messages';
import { auditMessages as text } from './auditMessages';

// One audited decision about an operator. The view maps from this single shape (spec 008 plan, risks), so the day
// the audit service names its columns differently only this file and the data source change.
export interface AuditEvent {
  id: string;
  // RFC 3339 in UTC.
  occurredAt: string;
  action: string;
  operator: string;
  change: string;
  actor: string;
  reason: string;
  // The extended part of the record, for the detail (spec 014, HU-IDA-002 AC2). Optional until the stub rows go (plan, PA-02).
  affectedRecord?: string;
  previousValue?: string;
  newValue?: string;
  channelOrModule?: string;
  functionalReference?: string;
}

export type AuditSource = () => Promise<AuditEvent[]>;

// shortcut: the audit service has no consultation route yet (G-1); the rows are marked test data and the
// production build gets none. Replace by the real call when the contract has it.
const TEST_EVENTS: AuditEvent[] = [
  { id: 'a1', occurredAt: '2026-10-12T14:32:00Z', action: 'Operador creado', operator: 'Travesía Natural', change: 'Sin estado → Activo', actor: 'admin@multitour.local', reason: 'Alta aprobada por el comité' },
  { id: 'a2', occurredAt: '2026-10-11T09:05:00Z', action: 'Operador inactivado', operator: 'Sierra Azul', change: 'Activo → Inactivo', actor: 'admin@multitour.local', reason: 'Solicitud del operador' },
  { id: 'a3', occurredAt: '2026-10-09T16:48:00Z', action: 'Operador reactivado', operator: 'Sierra Azul', change: 'Inactivo → Activo', actor: 'admin@multitour.local', reason: 'Documentación al día' },
];

export const stubAuditSource: AuditSource = async () => (import.meta.env.DEV ? TEST_EVENTS : []);

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
    operator: record.tenantId === null ? text.platform : (operatorNames.get(record.tenantId) ?? record.tenantId),
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
