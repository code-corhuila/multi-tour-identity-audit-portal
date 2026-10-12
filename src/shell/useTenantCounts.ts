import { useCallback, useEffect, useState } from 'react';
import type { ApiClient, ApiError } from '../contract';
import { listTenants, type TenantStatus } from '../data/tenants';

export interface TenantCounts {
  total: number;
  active: number;
  inactive: number;
}

type State = { kind: 'loading' } | { kind: 'error'; traceId?: string } | { kind: 'data'; counts: TenantCounts };

// The counts are the `meta.total` of three one-item pages of the tenants list: no new route is needed.
export function useTenantCounts(apiClient: ApiClient) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: 'loading' });
    const total = (status?: TenantStatus) =>
      listTenants(apiClient, { page: 1, limit: 1, status }, controller.signal).then((page) => page.meta.total);
    Promise.all([total(), total('ACTIVE'), total('INACTIVE')]).then(
      ([all, active, inactive]) => {
        if (!controller.signal.aborted) setState({ kind: 'data', counts: { total: all, active, inactive } });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setState({ kind: 'error', traceId: (error as ApiError | null)?.traceId });
      },
    );
    return () => controller.abort();
  }, [apiClient, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}
