import { useCallback, useEffect, useState } from 'react';
import type { ApiClient } from '../contract';
import { listAuditAccess, setAuditAccess, type OptionalRole } from '../data/auditAccess';

type Read = { kind: 'loading' } | { kind: 'error' } | { kind: 'data'; enabled: ReadonlyMap<OptionalRole, boolean> };
export type ChangeResult = { role: OptionalRole; enabled: boolean } | { role: OptionalRole; failed: true };

// The audit access of the three optional roles, as the service has it (spec 015 D-07). A change shows what the service answered, never
// what was pressed: the role waits in `pending` and, if the service refuses or fails, it keeps what it had.
export function useAuditAccess(apiClient: ApiClient | undefined) {
  const [read, setRead] = useState<Read>({ kind: 'loading' });
  const [pending, setPending] = useState<ReadonlySet<OptionalRole>>(new Set());
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!apiClient) return;
    const controller = new AbortController();
    setRead({ kind: 'loading' });
    listAuditAccess(apiClient, controller.signal).then(
      (list) => {
        if (!controller.signal.aborted) setRead({ kind: 'data', enabled: new Map(list.map((a) => [a.role, a.enabled])) });
      },
      () => {
        if (!controller.signal.aborted) setRead({ kind: 'error' });
      },
    );
    return () => controller.abort();
  }, [apiClient, attempt]);

  const change = useCallback(
    async (role: OptionalRole, enabled: boolean): Promise<ChangeResult> => {
      if (!apiClient) return { role, failed: true };
      setPending((current) => new Set(current).add(role));
      try {
        const answer = await setAuditAccess(apiClient, role, enabled, new AbortController().signal);
        setRead((current) => (current.kind === 'data' ? { kind: 'data', enabled: new Map(current.enabled).set(role, answer.enabled) } : current));
        return { role, enabled: answer.enabled };
      } catch {
        return { role, failed: true };
      } finally {
        setPending((current) => {
          const next = new Set(current);
          next.delete(role);
          return next;
        });
      }
    },
    [apiClient],
  );

  return { read, pending, change, retry: useCallback(() => setAttempt((n) => n + 1), []) };
}
