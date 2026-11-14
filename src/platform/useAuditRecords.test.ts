import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../contract';
import type { AuditPage, AuditRecordResponse } from '../data/audit';
import { useAuditRecords } from './useAuditRecords';

const record = (id: string): AuditRecordResponse => ({
  auditRecordId: id,
  tenantId: null,
  actorId: 'multi-tour-security',
  action: 'ACCOUNT_BLOCKED',
  affectedRecordId: 'accounts/1',
  recordedAt: '2026-11-06T14:32:00Z',
});
// the page a path asks for, whatever the order of its parameters
const askedPage = (path: string) => new URL(path, 'http://x').searchParams.get('page');
const pageOf = (page: number, id: string): AuditPage => ({ data: [record(id)], meta: { page, limit: 20, total: 40, totalPages: 2 } });

describe('the page of the audit (spec 014, RN-IDA-PT-25)', () => {
  it('U·a_slower_older_page_never_replaces_a_newer_one: the page asked last is the one that stays, whatever the order of the answers', async () => {
    let releaseFirst: (page: AuditPage) => void = () => {};
    const first = new Promise<AuditPage>((resolve) => (releaseFirst = resolve));
    const request = vi.fn((path: string) => (askedPage(path) === '1' ? first : Promise.resolve(pageOf(2, 'second'))));
    const apiClient = { request } as unknown as ApiClient;

    const { result, rerender } = renderHook(({ page }) => useAuditRecords(apiClient, { page, limit: 20 }), { initialProps: { page: 1 } });
    rerender({ page: 2 });
    await waitFor(() => expect(result.current.state).toMatchObject({ kind: 'data', page: { meta: { page: 2 } } }));

    // the answer of page 1 comes late, after page 2 is already shown
    await act(async () => releaseFirst(pageOf(1, 'first')));

    expect(result.current.state).toMatchObject({ kind: 'data', page: { meta: { page: 2 }, data: [{ auditRecordId: 'second' }] } });
  });

  it('U·the_error_of_a_stale_request_does_not_replace_the_newer_page', async () => {
    let failFirst: (error: Error) => void = () => {};
    const first = new Promise<AuditPage>((_, reject) => (failFirst = reject));
    const request = vi.fn((path: string) => (askedPage(path) === '1' ? first : Promise.resolve(pageOf(2, 'second'))));
    const apiClient = { request } as unknown as ApiClient;

    const { result, rerender } = renderHook(({ page }) => useAuditRecords(apiClient, { page, limit: 20 }), { initialProps: { page: 1 } });
    rerender({ page: 2 });
    await waitFor(() => expect(result.current.state.kind).toBe('data'));
    await act(async () => failFirst(new Error('late failure')));

    expect(result.current.state).toMatchObject({ kind: 'data', page: { meta: { page: 2 } } });
  });
});
