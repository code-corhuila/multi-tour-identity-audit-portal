import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../contract';
import type { TenantResponse } from '../data/tenants';
import { useTenantLocalization } from './useTenantLocalization';

const tenant: TenantResponse = {
  tenantId: '00000000-0000-4000-8000-00000000000a',
  identifier: 'acme-tours',
  commercialName: 'Acme Tours',
  tenantStatus: 'ACTIVE',
  timeZone: 'America/Bogota',
  country: 'CO',
  createdAt: '2026-10-10T10:00:00Z',
};
const clientOf = (request: unknown) => ({ request }) as unknown as ApiClient;

describe('the current zone and country of the tenant (portal spec 018, RN-IDA-PT-43)', () => {
  it('U·current_values_are_read_once: one GET of the contract route, no body, and the screen gets what the service says', async () => {
    const request = vi.fn(async () => tenant);

    const { result, rerender } = renderHook(() => useTenantLocalization(clientOf(request)));
    expect(result.current.state.kind).toBe('loading');
    await waitFor(() => expect(result.current.state).toMatchObject({ kind: 'data', timeZone: 'America/Bogota', country: 'CO', commercialName: 'Acme Tours' }));
    rerender();
    rerender();

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith('/api/v1/identity-audit/tenant/localization', expect.objectContaining({ method: 'GET' }));
    expect((request.mock.calls[0] as unknown[])[1]).not.toHaveProperty('body');
  });

  it('U·a_failed_read_offers_retry_and_the_retry_reads_again: the line names the trace and nothing is shown as current', async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce({ status: 503, traceId: 'trace-123' })
      .mockResolvedValueOnce(tenant);

    const { result } = renderHook(() => useTenantLocalization(clientOf(request)));
    await waitFor(() => expect(result.current.state.kind).toBe('error'));
    expect(result.current.state).toMatchObject({ kind: 'error', line: expect.stringContaining('trace-123') });
    expect(result.current.state).not.toHaveProperty('timeZone');
    expect(result.current.state).not.toHaveProperty('country');

    await act(async () => result.current.retry());
    await waitFor(() => expect(result.current.state).toMatchObject({ kind: 'data', country: 'CO' }));
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('U·an_older_answer_never_replaces_a_newer_one: the first read answers after the retry and the screen keeps the newer values', async () => {
    let releaseFirst: (tenant: TenantResponse) => void = () => {};
    const first = new Promise<TenantResponse>((resolve) => (releaseFirst = resolve));
    const request = vi.fn().mockReturnValueOnce(first).mockResolvedValueOnce({ ...tenant, timeZone: 'America/Mexico_City', country: 'MX' });

    const { result } = renderHook(() => useTenantLocalization(clientOf(request)));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    await act(async () => result.current.retry());
    await waitFor(() => expect(result.current.state).toMatchObject({ kind: 'data', country: 'MX' }));
    await act(async () => releaseFirst(tenant));

    expect(result.current.state).toMatchObject({ kind: 'data', timeZone: 'America/Mexico_City', country: 'MX' });
  });

  it('U·leaving_the_screen_aborts_the_read: the request in flight is cancelled and its answer is ignored', async () => {
    let signal: AbortSignal | undefined;
    const request = vi.fn((_path: string, init?: { signal?: AbortSignal }) => {
      signal = init?.signal;
      return new Promise<TenantResponse>(() => {});
    });

    const { unmount } = renderHook(() => useTenantLocalization(clientOf(request)));
    await waitFor(() => expect(request).toHaveBeenCalled());
    unmount();

    expect(signal?.aborted).toBe(true);
  });
});
