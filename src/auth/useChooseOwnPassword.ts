import { useEffect, useRef, useState } from 'react';
import type { ApiClient, ApiError } from '../contract';
import { changeOwnPassword } from '../data/security';
import { messages } from '../messages';

export interface PasswordFailure {
  // 'policy' belongs beside the field; the others go to the message line.
  kind: 'policy' | 'expired' | 'unavailable';
  text: string;
}

// The status decides the text, never the answer's message.
function describeFailure(error: unknown): PasswordFailure {
  const { status, traceId } = (error ?? {}) as ApiError;
  if (status === 400) return { kind: 'policy', text: messages.firstPassword.policyRefused };
  if (status === 401) return { kind: 'expired', text: messages.firstPassword.expired };
  const trace = traceId ? ` (${messages.errors.trace}: ${traceId})` : '';
  return { kind: 'unavailable', text: `${messages.errors.unavailable}${trace}` };
}

export function useChooseOwnPassword(apiClient: ApiClient) {
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<PasswordFailure | null>(null);
  const current = useRef<AbortController | null>(null);

  useEffect(() => () => current.current?.abort(), []);

  // Resolves true when the password was saved.
  async function submit(newPassword: string): Promise<boolean> {
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    setSending(true);
    setFailure(null);
    try {
      await changeOwnPassword(apiClient, newPassword, controller.signal);
      return !controller.signal.aborted;
    } catch (error) {
      if (!controller.signal.aborted) setFailure(describeFailure(error));
      return false;
    } finally {
      if (!controller.signal.aborted) setSending(false);
    }
  }

  return { sending, failure, submit };
}
