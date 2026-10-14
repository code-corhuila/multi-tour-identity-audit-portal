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
