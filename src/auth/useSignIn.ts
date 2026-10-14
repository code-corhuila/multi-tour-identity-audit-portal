import { useEffect, useRef, useState } from 'react';
import type { ApiClient, ApiError, Session } from '../contract';
import { signIn, type SignInRequest } from '../data/security';
import { messages } from '../messages';
import { STAFF_ROLES } from '../shell/roles';

// The status decides the text, never the answer's message (RN-SEC-PT-02).
function describeFailure(error: unknown): string {
  const { status, traceId } = (error ?? {}) as ApiError;
  const trace = traceId ? ` (${messages.errors.trace}: ${traceId})` : '';
  if (status === 401 || status === 400) return messages.errors.refused;
  return `${messages.errors.unavailable}${trace}`;
}

// Profile chosen on the operator tab; it sends nothing to the API, it is checked against the roles the session got.
export type TeamProfile = 'admin' | 'staff';
const ADMIN_ROLE = 'TENANT_ADMINISTRATOR';
const COLLABORATOR_ROLES = STAFF_ROLES.filter((r) => r !== ADMIN_ROLE);

type RoleCheck = 'ok' | 'mismatch' | 'customer';

function checkProfile(profile: TeamProfile, roles: string[]): RoleCheck {
  if (roles.includes('FINAL_CUSTOMER')) return 'customer';
  const required = profile === 'admin' ? [ADMIN_ROLE] : COLLABORATOR_ROLES;
  return roles.some((r) => required.includes(r)) ? 'ok' : 'mismatch';
}

export function useSignIn(identifier: string | undefined, apiClient: ApiClient, session: Session) {
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const current = useRef<AbortController | null>(null);

  useEffect(() => () => current.current?.abort(), []);

  // Resolves true when the session was opened and, on the operator tab, it matches the chosen profile.
  async function submit(credentials: SignInRequest, profile?: TeamProfile): Promise<boolean> {
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    setSending(true);
    setFailure(null);
    try {
      const answer = await signIn(apiClient, identifier, credentials, controller.signal);
      if (controller.signal.aborted) return false;
      session.open(answer);
      // A temporary or restricted token carries no ordinary roles: its screens (first password, notice) decide, so the
      // profile is not checked and the session is not closed here.
      const check = profile && session.access === undefined ? checkProfile(profile, session.roles) : 'ok';
      if (check !== 'ok') {
        // The account does not fit the operator tab: drop the session just opened and say so with a fixed text.
        session.close();
        setFailure(check === 'customer' ? messages.errors.refused : messages.errors.roleMismatch);
        return false;
      }
      return true;
    } catch (error) {
      if (!controller.signal.aborted) setFailure(describeFailure(error));
      return false;
    } finally {
      if (!controller.signal.aborted) setSending(false);
    }
  }

  return { sending, failure, submit };
}
