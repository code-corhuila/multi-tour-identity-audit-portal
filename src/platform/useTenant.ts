import { useCallback, useEffect, useState } from 'react';
import type { ApiClient, ApiError } from '../contract';
import { getTenant, type TenantResponse } from '../data/tenants';

type State = { kind: 'loading' } | { kind: 'error'; status?: number; traceId?: string } | { kind: 'data'; tenant: TenantResponse };

export function useTenant(apiClient: ApiClient, tenantId: string) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  // A newer request aborts the older one and an answer to an aborted request is dropped (RN-IDA-PT-07).
  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: 'loading' });
    getTenant(apiClient, tenantId, controller.signal).then(
      (tenant) => {
        if (!controller.signal.aborted) setState({ kind: 'data', tenant });
      },
      (error: unknown) => {
        const { status, traceId } = (error ?? {}) as ApiError;
        if (!controller.signal.aborted) setState({ kind: 'error', status, traceId });
      },
    );
    return () => controller.abort();
  }, [apiClient, tenantId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const replace = useCallback((tenant: TenantResponse) => setState({ kind: 'data', tenant }), []);
  return { state, retry, replace };
}
