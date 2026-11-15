import { useEffect, useRef, useState } from 'react';
import type { ApiClient } from '../contract';
import { toApiError } from '../apiError';
import { requestPasswordRecovery } from '../data/security';
import { messages } from '../messages';

export type RecoveryRequest =
  | { state: 'idle' | 'sending' | 'sent' }
  // `field` is the text beside the e-mail field; `line` is the message line (with the trace code).
  | { state: 'failed'; field?: string; line?: string };

// The status and the field decide the text, never the message of the answer. Only a 400 that names the e-mail goes beside the
// field; every 202 is `sent`, so the screen tells nobody which e-mails have an account (RN-PT-16-01).
function describeFailure(error: unknown): RecoveryRequest {
  const { status, traceId, details } = toApiError(error);
  if (status === 400 && (details ?? []).some((d) => d.field === 'email')) {
    return { state: 'failed', field: messages.recover.emailRefused };
  }
  const trace = traceId ? ` (${messages.errors.trace}: ${traceId})` : '';
  return { state: 'failed', line: `${messages.errors.unavailable}${trace}` };
}

export function useRequestRecovery(identifier: string | undefined, apiClient: ApiClient) {
  const [result, setResult] = useState<RecoveryRequest>({ state: 'idle' });
  const current = useRef<AbortController | null>(null);

  useEffect(() => () => current.current?.abort(), []);

  async function submit(email: string): Promise<void> {
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    setResult({ state: 'sending' });
    try {
      await requestPasswordRecovery(apiClient, identifier, email, controller.signal);
      if (!controller.signal.aborted) setResult({ state: 'sent' });
    } catch (error) {
      if (!controller.signal.aborted) setResult(describeFailure(error));
    }
  }

  return { result, submit };
}
