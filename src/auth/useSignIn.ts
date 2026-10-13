import { useEffect, useRef, useState } from 'react';
import type { ApiClient, ApiError, Session } from '../contract';
import { signIn, type SignInRequest } from '../data/security';
import { messages } from '../messages';

// The status decides the text, never the answer's message (RN-SEC-PT-02).
// In the general sign-in the company is typed too, so a refusal may be about either: one fixed text, with the trace id.
function describeFailure(error: unknown, general: boolean): string {
  const { status, traceId } = (error ?? {}) as ApiError;
  const trace = traceId ? ` (${messages.errors.trace}: ${traceId})` : '';
  if (general && status !== undefined && status < 500) return `${messages.errors.refusedGeneral}${trace}`;
  if (status === 401 || status === 400) return messages.errors.refused;
  return `${messages.errors.unavailable}${trace}`;
}

export function useSignIn(identifier: string | undefined, apiClient: ApiClient, session: Session, general = false) {
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const current = useRef<AbortController | null>(null);

  useEffect(() => () => current.current?.abort(), []);

  // Resolves true when the session was opened.
  async function submit(credentials: SignInRequest, company = identifier): Promise<boolean> {
    // The general sign-in never falls back to the platform route when the company is missing.
    if (general && company === undefined) return false;
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    setSending(true);
    setFailure(null);
    try {
      const answer = await signIn(apiClient, company, credentials, controller.signal);
      if (controller.signal.aborted) return false;
      // The general scope needs to know which company the session belongs to; the other scopes open it as before.
      if (general) session.open(answer, company);
      else session.open(answer);
      return true;
    } catch (error) {
      if (!controller.signal.aborted) setFailure(describeFailure(error, general));
      return false;
    } finally {
      if (!controller.signal.aborted) setSending(false);
    }
  }

  return { sending, failure, submit };
}
