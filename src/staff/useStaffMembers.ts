import { useCallback, useEffect, useState } from 'react';
import { stubStaffSource, type StaffMember, type StaffSource } from './staff';

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'data'; members: StaffMember[] };

// Same shape as the other list hooks: a newer request replaces the older one.
export function useStaffMembers(source: StaffSource = stubStaffSource) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setState({ kind: 'loading' });
    source().then(
      (members) => current && setState({ kind: 'data', members }),
      () => current && setState({ kind: 'error' }),
    );
    return () => {
      current = false;
    };
  }, [source, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}
