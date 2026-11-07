import { describe, expect, it } from 'vitest';
import type { AuditRecordResponse } from '../data/audit';
import { endOfDay, startOfDay, toAuditEvent } from './audit';

const TENANT = '3f2b8c1e-5d4a-4e7b-9a10-6c2d8e4f0a11';
const none = new Map<string, string>();

// A record with only what the service always gives; the other parts are absent.
const record = (over: Partial<AuditRecordResponse> = {}): AuditRecordResponse => ({
  auditRecordId: '00000000-0000-4000-8000-000000000001',
  tenantId: TENANT,
  actorId: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
  action: 'TENANT_INACTIVATED',
  affectedRecordId: `tenants/${TENANT}`,
  recordedAt: '2026-11-06T14:32:00Z',
  ...over,
});

// Section 4 of the spec: the name each known action has on the screen.
const names: Record<string, string> = {
  TENANT_CREATED: 'Operador creado',
  TENANT_INACTIVATED: 'Operador inactivado',
  TENANT_REACTIVATED: 'Operador reactivado',
  ACCOUNT_BLOCKED: 'Cuenta bloqueada',
  ACCOUNT_SESSIONS_REVOKED: 'Sesiones de una cuenta revocadas',
  SPECIAL_PERMISSION_GRANTED: 'Permiso especial otorgado',
  SPECIAL_PERMISSION_REVOKED: 'Permiso especial retirado',
  OPTIONAL_ROLE_ENABLED: 'Rol opcional habilitado',
  OPTIONAL_ROLE_DISABLED: 'Rol opcional deshabilitado',
  AUDIT_ACCESS_ENABLED: 'Acceso a la auditoría habilitado',
  AUDIT_ACCESS_DISABLED: 'Acceso a la auditoría retirado',
};

describe('the texts of a record (spec 014, RN-IDA-PT-20 to -23)', () => {
  it('U·known_actions_have_their_name_and_an_unknown_one_shows_its_code', () => {
    for (const [code, name] of Object.entries(names)) {
      expect(toAuditEvent(record({ action: code }), none).action, code).toBe(name);
    }
    expect(toAuditEvent(record({ action: 'PAYMENT_VALIDATED' }), none).action).toBe('PAYMENT_VALIDATED');
    // a code that is also a name of the prototype of an object is a code like any other, never a function
    for (const odd of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      expect(toAuditEvent(record({ action: odd }), none).action, odd).toBe(odd);
    }
  });

  it('U·a_missing_part_is_shown_as_a_dash', () => {
    const event = toAuditEvent(record(), none);

    expect(event.reason).toBe('—');
    expect(event.change).toBe('—');
    expect(event.previousValue).toBe('—');
    expect(event.newValue).toBe('—');
    expect(event.channelOrModule).toBe('—');
    expect(event.functionalReference).toBe('—');
    // an explicit null, as the service writes it, is the same as absent
    const nulls = toAuditEvent(record({ reason: null, previousValue: null, newValue: null, channelOrModule: null, functionalProcessReference: null }), none);
    expect([nulls.reason, nulls.previousValue, nulls.newValue, nulls.channelOrModule, nulls.functionalReference]).toEqual(['—', '—', '—', '—', '—']);
    // and so is an empty text
    const empty = toAuditEvent(record({ reason: '', channelOrModule: '', functionalProcessReference: '' }), none);
    expect([empty.reason, empty.channelOrModule, empty.functionalReference]).toEqual(['—', '—', '—']);
  });

  it('U·a_record_with_no_tenant_shows_the_platform', () => {
    expect(toAuditEvent(record({ tenantId: null, action: 'ACCOUNT_BLOCKED' }), new Map([[TENANT, 'Travesía Natural']])).operator).toBe('Plataforma');
  });

  it('U·a_blank_commercial_name_shows_the_identifier', () => {
    expect(toAuditEvent(record(), new Map([[TENANT, '']])).operator).toBe(TENANT);
  });

  it('U·operator_shows_the_commercial_name_when_known_and_the_identifier_when_not', () => {
    expect(toAuditEvent(record(), new Map([[TENANT, 'Travesía Natural']])).operator).toBe('Travesía Natural');
    expect(toAuditEvent(record(), none).operator).toBe(TENANT);
  });

  it('U·change_shows_the_status_before_and_after_when_the_record_has_them', () => {
    const both = record({ previousValue: { tenantStatus: 'ACTIVE' }, newValue: { tenantStatus: 'INACTIVE' } });
    expect(toAuditEvent(both, none).change).toBe('Activo → Inactivo');
    expect(toAuditEvent(record({ previousValue: { tenantStatus: 'PENDING' }, newValue: { tenantStatus: 'ACTIVE' } }), none).change).toBe('Pendiente → Activo');
    // one side only, a value that is not a status, or other keys: a dash, never a guess
    expect(toAuditEvent(record({ newValue: { tenantStatus: 'INACTIVE' } }), none).change).toBe('—');
    expect(toAuditEvent(record({ previousValue: { tenantStatus: 'ACTIVE' } }), none).change).toBe('—');
    expect(toAuditEvent(record({ previousValue: { tenantStatus: 7 }, newValue: { tenantStatus: 'ACTIVE' } }), none).change).toBe('—');
    // a status that is a name of the prototype of an object is not a status
    expect(toAuditEvent(record({ previousValue: { tenantStatus: 'constructor' }, newValue: { tenantStatus: 'ACTIVE' } }), none).change).toBe('—');
    expect(toAuditEvent(record({ previousValue: { tenantStatus: 'toString' }, newValue: { tenantStatus: 'toString' } }), none).change).toBe('—');
    expect(toAuditEvent(record({ previousValue: { permission: 'X' }, newValue: { permission: 'Y' } }), none).change).toBe('—');
  });

  it('U·the_columns_and_the_detail_carry_what_the_record_holds', () => {
    const event = toAuditEvent(
      record({
        reason: 'Documentación al día',
        previousValue: { tenantStatus: 'ACTIVE' },
        newValue: { tenantStatus: 'INACTIVE' },
        channelOrModule: 'ADMIN_PORTAL',
        functionalProcessReference: 'TENANT_LIFECYCLE',
      }),
      new Map([[TENANT, 'Sierra Azul']]),
    );

    expect(event).toMatchObject({
      id: '00000000-0000-4000-8000-000000000001',
      occurredAt: '2026-11-06T14:32:00Z',
      actor: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
      reason: 'Documentación al día',
      affectedRecord: `tenants/${TENANT}`,
      channelOrModule: 'ADMIN_PORTAL',
      functionalReference: 'TENANT_LIFECYCLE',
    });
    expect(JSON.parse(event.previousValue as string)).toEqual({ tenantStatus: 'ACTIVE' });
    expect(JSON.parse(event.newValue as string)).toEqual({ tenantStatus: 'INACTIVE' });
  });
});

describe('the end of a period (spec 014, plan D-06)', () => {
  it('U·the_end_of_a_period_is_the_start_of_the_next_day_in_utc', () => {
    expect(endOfDay('2026-11-07')).toBe('2026-11-08T00:00:00Z');
    expect(endOfDay('2026-12-31')).toBe('2027-01-01T00:00:00Z');
    expect(endOfDay('2028-02-28')).toBe('2028-02-29T00:00:00Z');
    // nothing chosen, or something that is not a day, is no end at all
    expect(endOfDay('')).toBeUndefined();
    expect(endOfDay('not a day')).toBeUndefined();
  });
});

describe('a day chosen for a period (spec 014, plan D-06)', () => {
  it('U·a_day_that_does_not_exist_is_no_day', () => {
    expect(endOfDay('2026-02-30')).toBeUndefined();
    expect(endOfDay('2100-02-29')).toBeUndefined();
    expect(startOfDay('2026-13-01')).toBeUndefined();
    // a year of five digits, which some browsers let a date control hold, is not asked: the service would answer 400
    expect(startOfDay('12026-01-01')).toBeUndefined();
  });

  it('U·the_start_and_the_end_of_a_day_hold_on_leap_years_and_on_the_day_of_a_change_of_hour', () => {
    expect(startOfDay('2026-11-07')).toBe('2026-11-07T00:00:00Z');
    expect(startOfDay('')).toBeUndefined();
    expect(endOfDay('2028-02-29')).toBe('2028-03-01T00:00:00Z');
    expect(endOfDay('2100-02-28')).toBe('2100-03-01T00:00:00Z');
    expect(endOfDay('2026-03-08')).toBe('2026-03-09T00:00:00Z');
  });
});
