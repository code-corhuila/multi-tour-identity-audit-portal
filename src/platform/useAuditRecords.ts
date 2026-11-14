import { useCallback, useEffect, useState } from 'react';
import { toApiError } from '../apiError';
import type { ApiClient } from '../contract';
import { listAuditRecords, type AuditPage, type AuditQuery } from '../data/audit';

type State = { kind: 'loading' } | { kind: 'error'; status?: number; traceId?: string } | { kind: 'data'; page: AuditPage };

type ListAudit = (client: ApiClient, query: AuditQuery, signal: AbortSignal) => Promise<AuditPage>;

// Same shape as the other lists of the panel (RN-IDA-PT-07): a newer request aborts the older one, and an answer to an
// aborted request is dropped, so a slow old page can never replace the page that was asked last.
// `list` must be a stable reference (a function of a module, never an inline arrow): it is a dependency of the read.
// `list` is the call that is made: the platform screen reads every tenant, the tenant screen reads its own (spec 015 D-03).
export function useAuditRecords(apiClient: ApiClient, query: AuditQuery, list: ListAudit = listAuditRecords) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const { page, limit, tenantId, action, from, to } = query;

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: 'loading' });
    list(apiClient, { page, limit, tenantId, action, from, to }, controller.signal).then(
      (answer) => {
        if (!controller.signal.aborted) setState({ kind: 'data', page: answer });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        const { status, traceId } = toApiError(error);
        setState({ kind: 'error', status, traceId });
      },
    );
    return () => controller.abort();
  }, [apiClient, list, page, limit, tenantId, action, from, to, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}
