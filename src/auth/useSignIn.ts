import { useEffect, useRef, useState } from 'react';
import type { ApiClient, ApiError, Session } from '../contract';
import { signIn, type SignInRequest } from '../data/security';
import { messages } from '../messages';

// The status decides the text, never the answer's message (RN-SEC-PT-02).
function describeFailure(error: unknown): string {
  const { status, traceId } = (error ?? {}) as ApiError;
  if (status === 401 || status === 400) return messages.errors.refused;
  const trace = traceId ? ` (${messages.errors.trace}: ${traceId})` : '';
  return `${messages.errors.unavailable}${trace}`;
}

export function useSignIn(identifier: string | undefined, apiClient: ApiClient, session: Session) {
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const current = useRef<AbortController | null>(null);

  useEffect(() => () => current.current?.abort(), []);

  // Resolves true when the session was opened.
  async function submit(credentials: SignInRequest): Promise<boolean> {
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    setSending(true);
    setFailure(null);
    try {
      const answer = await signIn(apiClient, identifier, credentials, controller.signal);
      if (controller.signal.aborted) return false;
      session.open(answer);
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