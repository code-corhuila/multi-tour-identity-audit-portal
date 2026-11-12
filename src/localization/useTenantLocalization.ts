import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiClient } from '../contract';
import { toApiError } from '../apiError';
import { messages } from '../messages';
import { getLocalization } from './localizationApi';

export type LocalizationState =
  | { kind: 'loading' }
  | { kind: 'error'; line: string }
  | { kind: 'data'; timeZone: string; country: string; commercialName: string };

// Reads the zone and the country the tenant has today, once when the screen opens and again only on retry. Leaving the
// screen aborts the read in flight and its answer is ignored (portal spec 018, D-01).
export function useTenantLocalization(apiClient: ApiClient) {
  const [state, setState] = useState<LocalizationState>({ kind: 'loading' });
  const current = useRef<AbortController | null>(null);
  const client = useRef(apiClient);
  client.current = apiClient;

  const read = useCallback(async () => {
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    setState({ kind: 'loading' });
    try {
      const tenant = await getLocalization(client.current, controller.signal);
      if (!controller.signal.aborted) setState({ kind: 'data', timeZone: tenant.timeZone, country: tenant.country, commercialName: tenant.commercialName });
    } catch (error) {
      if (controller.signal.aborted) return;
      const { traceId } = toApiError(error);
      const trace = traceId ? ` (${messages.errors.trace}: ${traceId})` : '';
      setState({ kind: 'error', line: `${messages.errors.unavailable}${trace}` });
    }
  }, []);

  useEffect(() => {
    void read();
    return () => current.current?.abort();
  }, [read]);

  return { state, retry: read };
}
