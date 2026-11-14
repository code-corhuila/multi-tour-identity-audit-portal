import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../contract';
import { messages } from '../messages';
import { brandingMessages as text } from './messages';
import { useTenantImage } from './useTenantImage';

const clientOf = (request: unknown) => ({ request }) as unknown as ApiClient;
const refusing = (error: unknown) => vi.fn(async () => Promise.reject(error));
const png = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], 'logo.png', { type: 'image/png' });

describe('save and remove one place (portal spec 019, RN-IDA-PT-64, -65, -68, -69)', () => {
  it('U·the_request_has_the_content_type_and_the_base64_data: one PUT to the route of the logo, with no Idempotency-Key', async () => {
    const request = vi.fn(async () => ({}));
    const { result } = renderHook(() => useTenantImage(clientOf(request), { slot: 'logo' }));
    let done = false;
    await act(async () => {
      done = await result.current.save(png());
    });
    expect(done).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
    const [path, init] = request.mock.calls[0] as unknown as [string, { method: string; body: unknown; headers?: unknown }];
    expect(path).toBe('/api/v1/identity-audit/tenant/logo');
    expect(init.method).toBe('PUT');
    expect(init.body).toEqual({ contentType: 'image/png', data: 'iVBORw0KGgo=' });
    expect(init.headers).toBeUndefined();
    expect(result.current.saved).toBe(true);
  });

  it('an image goes to the route of its position', async () => {
    const request = vi.fn(async () => ({}));
    const { result } = renderHook(() => useTenantImage(clientOf(request), { slot: 'image', position: 3 }));
    await act(async () => {
      await result.current.save(png());
    });
    expect((request.mock.calls[0] as unknown as [string])[0]).toBe('/api/v1/identity-audit/tenant/images/3');
  });

  it('U·removing_asks_first (the hook only sends): one DELETE of its place and nothing in the body', async () => {
    const request = vi.fn(async () => undefined);
    const { result } = renderHook(() => useTenantImage(clientOf(request), { slot: 'image', position: 0 }));
    let done = false;
    await act(async () => {
      done = await result.current.remove();
    });
    expect(done).toBe(true);
    const [path, init] = request.mock.calls[0] as unknown as [string, { method: string; body?: unknown }];
    expect(path).toBe('/api/v1/identity-audit/tenant/images/0');
    expect(init.method).toBe('DELETE');
    expect(init.body).toBeUndefined();
    expect(result.current.saved).toBe(true);
  });

  it('U·refusals_are_shown_with_their_text: each status has its own line and its own retry', async () => {
    const cases: Array<[number, string, boolean]> = [
      [400, text.fileRefused, false],
      [413, text.tooBig, false],
      [422, text.inactive, false],
      [403, text.forbidden, false],
    ];
    for (const [status, line, retryable] of cases) {
      const { result } = renderHook(() => useTenantImage(clientOf(refusing({ status })), { slot: 'logo' }));
      let done = true;
      await act(async () => {
        done = await result.current.save(png());
      });
      expect(done, String(status)).toBe(false);
      expect(result.current.failure, String(status)).toEqual({ line, retryable });
      expect(result.current.saved).toBe(false);
    }
  });

  it('a failure of the network or the server, or a 429, may be tried again and shows the trace', async () => {
    for (const error of [{ status: 503, traceId: 'trace-1' }, { traceId: 'trace-1' }, { status: 429, traceId: 'trace-1' }]) {
      const { result } = renderHook(() => useTenantImage(clientOf(refusing(error)), { slot: 'logo' }));
      await act(async () => {
        await result.current.save(png());
      });
      expect(result.current.failure?.retryable).toBe(true);
      expect(result.current.failure?.line).toContain(messages.errors.unavailable);
      expect(result.current.failure?.line).toContain('trace-1');
    }
  });

  it('another refusal of the request itself (a 404, a 415) is not offered again', async () => {
    for (const status of [404, 415]) {
      const { result } = renderHook(() => useTenantImage(clientOf(refusing({ status })), { slot: 'logo' }));
      await act(async () => {
        await result.current.save(png());
      });
      expect(result.current.failure?.retryable, String(status)).toBe(false);
    }
  });

  it('a request that was replaced while its file was being read never reaches the client', async () => {
    const request = vi.fn(async () => ({}));
    const { result } = renderHook(() => useTenantImage(clientOf(request), { slot: 'logo' }));
    await act(async () => {
      const first = result.current.save(png());
      const second = result.current.save(png());
      expect(await first).toBe(false);
      expect(await second).toBe(true);
    });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('U·newer_request_replaces_the_older: the older answer is dropped and its failure does not show', async () => {
    let rejectFirst: (reason: unknown) => void = () => undefined;
    let calls = 0;
    const request = vi.fn(() => {
      calls += 1;
      if (calls === 1) return new Promise((_, reject) => { rejectFirst = reject; });
      return Promise.resolve({});
    });
    const { result } = renderHook(() => useTenantImage(clientOf(request), { slot: 'logo' }));
    let first: Promise<boolean> = Promise.resolve(false);
    act(() => {
      first = result.current.save(png());
    });
    // the first request reaches the client, and is still waiting, before the newer one replaces it
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    await act(async () => {
      await result.current.save(png());
    });
    await act(async () => {
      rejectFirst({ status: 500 });
      await first;
    });
    expect(await first).toBe(false);
    expect(result.current.saved).toBe(true);
    expect(result.current.failure).toBeNull();
    expect(result.current.sending).toBe(false);
  });

  it('reset: the refusal and the saved line of an earlier request go away when the person chooses again', async () => {
    const { result } = renderHook(() => useTenantImage(clientOf(refusing({ status: 413 })), { slot: 'logo' }));
    await act(async () => {
      await result.current.save(png());
    });
    expect(result.current.failure).not.toBeNull();
    act(() => result.current.reset());
    expect(result.current.failure).toBeNull();
    expect(result.current.saved).toBe(false);
  });
});
