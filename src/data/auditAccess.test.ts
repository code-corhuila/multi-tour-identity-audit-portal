import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../contract';
import { listAuditAccess, setAuditAccess } from './auditAccess';

const client = (answer: unknown) => {
  const request = vi.fn(async () => answer);
  return { client: { request } as unknown as ApiClient, request };
};

describe('the audit access of the optional roles (spec 015, plan D-07)', () => {
  it('U·audit_access_is_read_and_set_through_its_routes', async () => {
    const signal = new AbortController().signal;
    const list = { data: [{ role: 'MANAGER', enabled: false }, { role: 'ACCOUNTANT', enabled: false }, { role: 'ANALYST', enabled: true }] };
    const reading = client(list);

    const read = await listAuditAccess(reading.client, signal);

    expect(read).toBe(list.data);
    expect(reading.request).toHaveBeenCalledWith('/api/v1/identity-audit/tenant/audit-access', { signal });

    const answer = { role: 'ACCOUNTANT', enabled: true, changedBy: null, changedAt: null };
    const setting = client(answer);

    const set = await setAuditAccess(setting.client, 'ACCOUNTANT', true, signal);

    expect(set).toBe(answer);
    // the role goes in the path, the tenant never goes anywhere; a PUT of a setting creates nothing, so no Idempotency-Key
    expect(setting.request).toHaveBeenCalledWith('/api/v1/identity-audit/tenant/audit-access/ACCOUNTANT', {
      method: 'PUT',
      body: { enabled: true },
      signal,
    });
  });
});
