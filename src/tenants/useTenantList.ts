import { useCallback, useEffect, useState } from 'react';
import type { ApiClient, ApiError } from '../contract';
import { listTenants, type TenantPage, type TenantQuery } from '../data/tenants';

type State = { kind: 'loading' } | { kind: 'error'; traceId?: string } | { kind: 'data'; page: TenantPage };

export function useTenantList(apiClient: ApiClient, query: TenantQuery) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const { page, limit, status } = query;

  // A newer request aborts the older one (the cleanup), and an answer to an aborted request is dropped (RN-IDA-PT-07).
  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: 'loading' });
    listTenants(apiClient, { page, limit, status }, controller.signal).then(
      (answer) => {
        if (!controller.signal.aborted) setState({ kind: 'data', page: answer });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setState({ kind: 'error', traceId: (error as ApiError | null)?.traceId });
      },
    );
    return () => controller.abort();
  }, [apiClient, page, limit, status, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}
