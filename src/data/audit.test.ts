import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../contract';
import { auditPath, listAuditRecords, listOwnAuditRecords, ownAuditPath } from './audit';

const BASE = '/api/v1/identity-audit/audit-records';
const TENANT = '3f2b8c1e-5d4a-4e7b-9a10-6c2d8e4f0a11';

describe('the call to the audit (spec 014, plan D-01)', () => {
  it('U·audit_path_carries_page_limit_and_only_the_filters_that_are_set', () => {
    expect(auditPath({ page: 1, limit: 20 })).toBe(`${BASE}?page=1&limit=20`);
    expect(auditPath({ page: 3, limit: 20, action: 'ACCOUNT_BLOCKED' })).toBe(`${BASE}?page=3&limit=20&action=ACCOUNT_BLOCKED`);
    expect(auditPath({ page: 1, limit: 20, tenantId: TENANT, from: '2026-11-01T00:00:00Z', to: '2026-11-08T00:00:00Z' })).toBe(
      `${BASE}?page=1&limit=20&tenantId=${TENANT}&from=2026-11-01T00%3A00%3A00Z&to=2026-11-08T00%3A00%3A00Z`,
    );
    // what the person typed or chose cannot add or cut a parameter
    const hostile = auditPath({ page: 1, limit: 20, action: 'A&page=9#x y', tenantId: 'a=b' });
    expect(hostile).toBe(`${BASE}?page=1&limit=20&tenantId=a%3Db&action=A%26page%3D9%23x+y`);
    expect(new URL(hostile, 'http://x').searchParams.get('page')).toBe('1');
    // a filter that is empty is not a filter: the service would answer 400 to an empty action
    expect(auditPath({ page: 1, limit: 20, tenantId: '', action: '', from: '', to: '' })).toBe(`${BASE}?page=1&limit=20`);
  });

  it('U·the_list_asks_the_client_for_that_path_with_the_signal_and_returns_its_answer', async () => {
    const answer = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    const request = vi.fn(async () => answer);
    const signal = new AbortController().signal;

    const page = await listAuditRecords({ request } as unknown as ApiClient, { page: 2, limit: 20 }, signal);

    expect(page).toBe(answer);
    expect(request).toHaveBeenCalledWith(`${BASE}?page=2&limit=20`, { signal });
  });
});

describe('the call to the audit of the own tenant (spec 015, plan D-02)', () => {
  const OWN = '/api/v1/identity-audit/tenant/audit-records';

  it('U·own_audit_path_carries_no_tenant_and_only_the_filters_that_are_set', () => {
    expect(ownAuditPath({ page: 1, limit: 20 })).toBe(`${OWN}?page=1&limit=20`);
    expect(ownAuditPath({ page: 2, limit: 20, action: 'ACCOUNT_BLOCKED', from: '2026-11-01T00:00:00Z', to: '2026-11-08T00:00:00Z' })).toBe(
      `${OWN}?page=2&limit=20&action=ACCOUNT_BLOCKED&from=2026-11-01T00%3A00%3A00Z&to=2026-11-08T00%3A00%3A00Z`,
    );
    // the service answers 400 to a tenantId on this route: even a value forced past the type never reaches the path
    const forced = ownAuditPath({ page: 1, limit: 20, tenantId: TENANT } as never);
    expect(new URL(forced, 'http://x').searchParams.has('tenantId')).toBe(false);
    // a filter that is empty is not a filter
    expect(ownAuditPath({ page: 1, limit: 20, action: '', from: '', to: '' })).toBe(`${OWN}?page=1&limit=20`);
  });

  it('U·the_own_list_asks_the_client_for_that_path_with_the_signal_and_returns_its_answer', async () => {
    const answer = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    const request = vi.fn(async () => answer);
    const signal = new AbortController().signal;

    const page = await listOwnAuditRecords({ request } as unknown as ApiClient, { page: 3, limit: 20 }, signal);

    expect(page).toBe(answer);
    expect(request).toHaveBeenCalledWith(`${OWN}?page=3&limit=20`, { signal });
  });
});
