import { useEffect, useRef, useState } from 'react';
import type { ApiClient } from '../contract';
import { toApiError } from '../apiError';
import { messages } from '../messages';
import { brandingMessages as text } from './messages';
import { readFileAsBase64 } from './readFileAsBase64';

// One place of the screen: the logo, or one of the five images (portal spec 019, D-01 and D-06).
export type ImagePlace = { slot: 'logo' } | { slot: 'image'; position: number };

export interface ImageFailure {
  line: string;
  // Whether trying again with the same file can work: a refusal of the rule or of the role cannot.
  retryable: boolean;
}

// Routes of `setTenantLogo`, `removeTenantLogo`, `setTenantImage` and `removeTenantImage` (identity-audit.yaml 1.7). The tenant comes from the
// token, never from the path or the body.
const BASE = '/api/v1/identity-audit/tenant';
const pathOf = (place: ImagePlace) => (place.slot === 'logo' ? `${BASE}/logo` : `${BASE}/images/${place.position}`);

// The status decides the text, never the answer's message (portal 003 D-03): the message of the service is English and is not shown.
function mapError(error: unknown): ImageFailure {
  const { status, traceId } = toApiError(error);
  if (status === 400) return { line: text.fileRefused, retryable: false };
  if (status === 413) return { line: text.tooBig, retryable: false };
  if (status === 422) return { line: text.inactive, retryable: false };
  if (status === 403) return { line: text.forbidden, retryable: false };
  const trace = traceId ? ` (${messages.errors.trace}: ${traceId})` : '';
  // another refusal of the request itself (a 404, a 415) cannot work again with the same body
  const refused = status !== undefined && status >= 400 && status < 500 && status !== 429;
  return { line: `${messages.errors.unavailable}${trace}`, retryable: !refused };
}

export function useTenantImage(apiClient: ApiClient, place: ImagePlace) {
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<ImageFailure | null>(null);
  const [saved, setSaved] = useState(false);
  const current = useRef<AbortController | null>(null);

  // A newer request of this place aborts the older one, and leaving the screen aborts the one in flight.
  useEffect(() => () => current.current?.abort(), []);

  // Resolves true when the service took the request, false when it did not go through.
  async function run(send: (signal: AbortSignal) => Promise<unknown>): Promise<boolean> {
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    setSending(true);
    setFailure(null);
    setSaved(false);
    try {
      await send(controller.signal);
      if (controller.signal.aborted) return false;
      setSaved(true);
      return true;
    } catch (error) {
      if (!controller.signal.aborted) setFailure(mapError(error));
      return false;
    } finally {
      if (!controller.signal.aborted) setSending(false);
    }
  }

  // The file goes as `{contentType, data}` with the file in base64. A PUT creates nothing, so it takes no Idempotency-Key.
  function save(file: File): Promise<boolean> {
    return run(async (signal) => {
      const data = await readFileAsBase64(file);
      // a newer request replaced this one while the file was being read: nothing is sent
      signal.throwIfAborted();
      return apiClient.request(pathOf(place), { method: 'PUT', body: { contentType: file.type, data }, signal });
    });
  }

  function remove(): Promise<boolean> {
    return run((signal) => apiClient.request(pathOf(place), { method: 'DELETE', signal }));
  }

  // The person chose something else: the refusal and the "saved" line of the earlier request no longer describe the place.
  function reset() {
    setFailure(null);
    setSaved(false);
  }

  return { sending, failure, saved, save, remove, reset };
}
