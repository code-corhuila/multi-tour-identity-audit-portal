import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../contract';
import type { TenantResponse } from '../data/tenants';
import { messages } from '../messages';
import { localizationMessages as text } from './messages';
import { useChangeLocalization } from './useChangeLocalization';

const tenant: TenantResponse = {
  tenantId: '00000000-0000-4000-8000-00000000000a',
  identifier: 'acme-tours',
  commercialName: 'Acme Tours',
  tenantStatus: 'ACTIVE',
  timeZone: 'America/Mexico_City',
  country: 'MX',
  createdAt: '2026-10-10T10:00:00Z',
};
const clientOf = (request: unknown) => ({ request }) as unknown as ApiClient;
const refusing = (error: unknown) => vi.fn(async () => Promise.reject(error));

describe('the change of the zone and the country (portal spec 018, RN-IDA-PT-46 to -48, -50, -51)', () => {
  it('U·request_has_only_the_changed_fields: one PUT of the contract route, the body without what did not change and no Idempotency-Key', async () => {
    const request = vi.fn(async () => tenant);
    const { result } = renderHook(() => useChangeLocalization(clientOf(request)));

    let answer: TenantResponse | null = null;
    await act(async () => {
      answer = await result.current.submit({ timeZone: 'America/Mexico_City' });
    });

    expect(request).toHaveBeenCalledTimes(1);
    const [path, init] = request.mock.calls[0] as unknown as [string, { method: string; body: unknown; headers?: unknown }];
    expect(path).toBe('/api/v1/identity-audit/tenant/localization');
    expect(init.method).toBe('PUT');
    expect(init.body).toEqual({ timeZone: 'America/Mexico_City' });
    expect(init.headers).toBeUndefined();
    expect(answer).toMatchObject({ timeZone: 'America/Mexico_City', country: 'MX' });
    expect(result.current.saved).toBe(true);
  });

  it('U·open_cash_is_explained: a 422 on a request that carries a zone, alone or with the country, is the cash text and trying again as it is cannot work', async () => {
    const { result } = renderHook(() => useChangeLocalization(clientOf(refusing({ status: 422, code: 'BUSINESS_RULE_VIOLATION' }))));

    let answer: TenantResponse | null = tenant;
    await act(async () => {
      answer = await result.current.submit({ timeZone: 'America/Lima' });
    });

    expect(answer).toBeNull();
    expect(result.current.failure).toMatchObject({ line: text.openCash, retryable: false });
    expect(result.current.saved).toBe(false);
    expect(result.current.sending).toBe(false);
  });

  it('U·cash_unreadable_is_explained_and_nothing_changed: a 503 says nothing changed and offers to try again', async () => {
    const { result } = renderHook(() => useChangeLocalization(clientOf(refusing({ status: 503, code: 'SERVICE_UNAVAILABLE' }))));

    await act(async () => {
      await result.current.submit({ timeZone: 'America/Lima' });
    });

    expect(result.current.failure).toMatchObject({ line: text.cashUnreadable, retryable: true });
  });

  it('U·refusals_are_shown_like_the_other_screens: 403 as not authorised, a 400 beside its field, a 422 on the country alone as the inactive company, anything else as a line with the trace and a retry', async () => {
    const run = async (error: unknown, body: { timeZone?: string; country?: string }) => {
      const { result } = renderHook(() => useChangeLocalization(clientOf(refusing(error))));
      await act(async () => {
        await result.current.submit(body);
      });
      return result.current.failure;
    };

    expect(await run({ status: 403 }, { country: 'PE' })).toMatchObject({ line: text.forbidden, retryable: false });
    expect(await run({ status: 422 }, { country: 'PE' })).toMatchObject({ line: text.inactive, retryable: false });
    expect(await run({ status: 400, details: [{ field: 'timeZone', message: 'must be an existing time zone' }] }, { timeZone: 'X/Y' })).toEqual({
      fields: { timeZone: text.zoneShape },
      retryable: false,
    });
    expect(await run({ status: 400, details: [{ field: 'country', message: 'x' }] }, { country: 'ZZ' })).toMatchObject({ fields: { country: text.countryShape } });
    const other = await run({ status: 500, traceId: 'trace-9' }, { country: 'PE' });
    expect(other).toMatchObject({ retryable: true });
    expect(other?.line).toContain('trace-9');
    expect(other?.line).toContain(messages.errors.unavailable);
    // a request that was refused as sent cannot work again with the same body, a failure of the network or the server can
    expect(await run({ status: 400 }, { country: 'PE' })).toMatchObject({ retryable: false });
    expect(await run({ status: 404 }, { country: 'PE' })).toMatchObject({ retryable: false });
    expect(await run({ status: 429 }, { country: 'PE' })).toMatchObject({ retryable: true });
    expect(await run('not an object', { country: 'PE' })).toMatchObject({ retryable: true });
    expect(await run({ status: 422 }, { timeZone: 'America/Lima', country: 'PE' })).toMatchObject({ line: text.openCash });
  });

  it('U·newer_save_replaces_the_older: a save that works clears the failure of the one before, and the screen is told only about the newest', async () => {
    const request = vi.fn().mockRejectedValueOnce({ status: 500 }).mockResolvedValueOnce(tenant);
    const { result } = renderHook(() => useChangeLocalization(clientOf(request)));

    await act(async () => {
      await result.current.submit({ country: 'MX' });
    });
    expect(result.current.failure).not.toBeNull();
    await act(async () => {
      await result.current.submit({ country: 'MX' });
    });

    expect(result.current.failure).toBeNull();
    expect(result.current.saved).toBe(true);
  });

  it('U·a_newer_save_aborts_the_older_one: the older answer comes late and is ignored, and the state follows the newest only', async () => {
    const signals: AbortSignal[] = [];
    let releaseFirst: (tenant: TenantResponse) => void = () => {};
    const first = new Promise<TenantResponse>((resolve) => (releaseFirst = resolve));
    const request = vi
      .fn()
      .mockImplementationOnce((_path: string, init: { signal: AbortSignal }) => (signals.push(init.signal), first))
      .mockImplementationOnce((_path: string, init: { signal: AbortSignal }) => (signals.push(init.signal), new Promise<TenantResponse>(() => {})));
    const { result } = renderHook(() => useChangeLocalization(clientOf(request)));

    let older: Promise<TenantResponse | null> = Promise.resolve(null);
    act(() => {
      older = result.current.submit({ country: 'MX' });
    });
    act(() => {
      void result.current.submit({ country: 'PE' });
    });
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
    await act(async () => releaseFirst(tenant));

    expect(await older).toBeNull();
    expect(result.current.saved).toBe(false);
    expect(result.current.sending).toBe(true);
  });

  it('U·leaving_the_screen_aborts_the_save: the request in flight is cancelled', async () => {
    let signal: AbortSignal | undefined;
    const request = vi.fn((_path: string, init?: { signal?: AbortSignal }) => {
      signal = init?.signal;
      return new Promise<TenantResponse>(() => {});
    });
    const { result, unmount } = renderHook(() => useChangeLocalization(clientOf(request)));

    act(() => {
      void result.current.submit({ country: 'MX' });
    });
    expect(result.current.sending).toBe(true);
    unmount();

    expect(signal?.aborted).toBe(true);
  });
});
