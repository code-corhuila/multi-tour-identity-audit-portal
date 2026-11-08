import { useEffect, useRef, useState } from 'react';
import type { ApiClient } from '../contract';
import { toApiError } from '../apiError';
import { resetPassword, type ResetPasswordRequest } from '../data/security';
import { messages } from '../messages';

export type ResetField = 'email' | 'code' | 'newPassword' | 'newPasswordConfirmation';

export type PasswordReset =
  | { state: 'idle' | 'sending' | 'done' }
  // `fields` are the texts beside the fields the answer names; `refused` is a code that does not work, whatever the reason
  // (RN-PT-16-03); `line` is the message line (with the trace code).
  | { state: 'failed'; fields?: Partial<Record<ResetField, string>>; refused?: boolean; line?: string };

const FIELDS: ResetField[] = ['email', 'code', 'newPassword', 'newPasswordConfirmation'];

// The status and the fields decide the text, never the message of the answer: it is in English, written for a developer.
function describeFailure(error: unknown): PasswordReset {
  const { status, traceId, details } = toApiError(error);
  if (status === 400) {
    const fields: Partial<Record<ResetField, string>> = {};
    for (const d of details ?? []) {
      const name = FIELDS.find((f) => f === d.field);
      if (name) fields[name] = messages.reset.fieldRefused[name];
    }
    return Object.keys(fields).length > 0 ? { state: 'failed', fields } : { state: 'failed', line: messages.reset.reviewData };
  }
  if (status === 422) return { state: 'failed', refused: true };
  const trace = traceId ? ` (${messages.errors.trace}: ${traceId})` : '';
  return { state: 'failed', line: `${messages.errors.unavailable}${trace}` };
}

export function useResetPassword(identifier: string | undefined, apiClient: ApiClient) {
  const [result, setResult] = useState<PasswordReset>({ state: 'idle' });
  const current = useRef<AbortController | null>(null);

  useEffect(() => () => current.current?.abort(), []);

  // Resolves when the answer came, whatever it was: the caller clears the passwords then, never before.
  async function submit(body: ResetPasswordRequest): Promise<void> {
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    setResult({ state: 'sending' });
    try {
      await resetPassword(apiClient, identifier, body, controller.signal);
      if (!controller.signal.aborted) setResult({ state: 'done' });
    } catch (error) {
      if (!controller.signal.aborted) setResult(describeFailure(error));
    }
  }

  return { result, submit };
}
