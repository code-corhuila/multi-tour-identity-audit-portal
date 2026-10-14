import { useCallback, useEffect, useState } from 'react';
import { stubAuditSource, type AuditEvent, type AuditSource } from './audit';

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'data'; rows: AuditEvent[] };

// Same shape as the other list hooks (portal 001 RN-IDA-PT-07): a newer request replaces the older one.
export function useAuditEvents(source: AuditSource = stubAuditSource) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setState({ kind: 'loading' });
    source().then(
      (rows) => current && setState({ kind: 'data', rows }),
      () => current && setState({ kind: 'error' }),
    );
    return () => {
      current = false;
    };
  }, [source, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}
