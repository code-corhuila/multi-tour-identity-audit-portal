import { useCallback, useEffect, useState } from 'react';
import { toApiError } from '../apiError';
import type { ApiClient } from '../contract';
import { listAuditRecords, type AuditPage, type AuditQuery } from '../data/audit';

type State = { kind: 'loading' } | { kind: 'error'; traceId?: string } | { kind: 'data'; page: AuditPage };

// Same shape as the other lists of the panel (RN-IDA-PT-07): a newer request aborts the older one, and an answer to an
// aborted request is dropped, so a slow old page can never replace the page that was asked last.
export function useAuditRecords(apiClient: ApiClient, query: AuditQuery) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const { page, limit, tenantId, action, from, to } = query;

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: 'loading' });
    listAuditRecords(apiClient, { page, limit, tenantId, action, from, to }, controller.signal).then(
      (answer) => {
        if (!controller.signal.aborted) setState({ kind: 'data', page: answer });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setState({ kind: 'error', traceId: toApiError(error).traceId });
      },
    );
    return () => controller.abort();
  }, [apiClient, page, limit, tenantId, action, from, to, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}
