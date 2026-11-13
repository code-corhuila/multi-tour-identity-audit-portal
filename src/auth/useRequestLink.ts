import { useEffect, useRef, useState } from 'react';
import type { ApiClient, ApiError } from '../contract';
import { requestEmailVerification } from '../data/security';
import { messages } from '../messages';

export type LinkRequest =
  | { state: 'idle' | 'sending' | 'sent' }
  // `field` is the text beside the e-mail field; `line` is the message line (with the trace code).
  | { state: 'failed'; field?: string; line?: string };

// The status and the field decide the text, never the message of the answer. Only a 400 that names the e-mail goes beside
// the field; every 202 is `sent`, so the screen tells nobody which e-mails have an account (RN-SEC-PT-34).
function describeFailure(error: unknown): LinkRequest {
  const { status, traceId, details } = (error ?? {}) as ApiError;
  if (status === 400 && (details ?? []).some((d) => d.field === 'email')) {
    return { state: 'failed', field: messages.signUp.fieldRefused.email };
  }
  const trace = traceId ? ` (${messages.errors.trace}: ${traceId})` : '';
  return { state: 'failed', line: `${messages.errors.unavailable}${trace}` };
}

export function useRequestLink(identifier: string, apiClient: ApiClient) {
  const [result, setResult] = useState<LinkRequest>({ state: 'idle' });
  const current = useRef<AbortController | null>(null);

  useEffect(() => () => current.current?.abort(), []);

  async function submit(email: string): Promise<void> {
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    setResult({ state: 'sending' });
    try {
      await requestEmailVerification(apiClient, identifier, email, controller.signal);
      if (!controller.signal.aborted) setResult({ state: 'sent' });
    } catch (error) {
      if (!controller.signal.aborted) setResult(describeFailure(error));
    }
  }

  return { result, submit };
}
