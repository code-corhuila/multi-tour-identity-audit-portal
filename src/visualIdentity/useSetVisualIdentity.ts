import { useEffect, useRef, useState } from 'react';
import type { ApiClient, ApiError, VisualIdentity } from '../contract';
import { messages } from '../messages';
import { visualIdentityMessages as text } from './messages';
import { setVisualIdentity } from './visualIdentityApi';

export interface SaveFailure {
  // Errors that belong beside a color field.
  fields: Partial<Record<keyof VisualIdentity, string>>;
  // Errors that do not (the message line).
  line?: string;
}

// The status and the field decide the text, never the answer's message (portal 003 D-03).
function mapError(error: unknown): SaveFailure {
  const { status, traceId, details } = (error ?? {}) as ApiError;
  if (status === 400) {
    const fields: SaveFailure['fields'] = {};
    for (const d of details ?? []) {
      if (d.field === 'primaryColor' || d.field === 'secondaryColor') fields[d.field] = text.colorShape;
    }
    if (Object.keys(fields).length > 0) return { fields };
  }
  if (status === 403) return { fields: {}, line: text.forbidden };
  if (status === 422) return { fields: {}, line: text.inactive };
  const trace = traceId ? ` (${messages.errors.trace}: ${traceId})` : '';
  return { fields: {}, line: `${messages.errors.unavailable}${trace}` };
}

export function useSetVisualIdentity(apiClient: ApiClient) {
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<SaveFailure | null>(null);
  const [saved, setSaved] = useState(false);
  const current = useRef<AbortController | null>(null);

  // A newer save aborts the older one, and leaving the screen aborts the one in flight (D-06).
  useEffect(() => () => current.current?.abort(), []);

  // Resolves with the colors the service stored, or null when the save did not go through.
  async function submit(colors: VisualIdentity): Promise<VisualIdentity | null> {
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    setSending(true);
    setFailure(null);
    setSaved(false);
    try {
      const answer = await setVisualIdentity(apiClient, colors, controller.signal);
      if (controller.signal.aborted) return null;
      setSaved(true);
      return answer.visualIdentity ?? colors;
    } catch (error) {
      if (!controller.signal.aborted) setFailure(mapError(error));
      return null;
    } finally {
      if (!controller.signal.aborted) setSending(false);
    }
  }

  return { sending, failure, saved, submit };
}
