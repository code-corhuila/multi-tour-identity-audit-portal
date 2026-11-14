import { useEffect, useRef, useState } from 'react';
import type { ApiClient } from '../contract';
import type { TenantResponse } from '../data/tenants';
import { toApiError } from '../apiError';
import { messages } from '../messages';
import { changeLocalization, type LocalizationChange } from './localizationApi';
import { localizationMessages as text } from './messages';

export interface ChangeFailure {
  // Errors that belong beside a field.
  fields: Partial<Record<keyof LocalizationChange, string>>;
  // Errors that do not (the message line).
  line?: string;
  // Whether trying again with the same choice can work: a refusal of the rule or of the role cannot.
  retryable: boolean;
}

// The status and what was sent decide the text, never the answer's message (portal 003 D-03; spec 018 D-05): a 422 on a
// request that carries a zone is the open cash, one on the country alone can only be the inactive company. The service
// answers the same 422 for an inactive tenant that sends a zone, so the screen does not offer the form when the tenant it
// read is not active (spec 018 gap G-5); what is left of that case is a tenant inactivated while the form was open.
function mapError(error: unknown, body: LocalizationChange): ChangeFailure {
  const { status, traceId, details } = toApiError(error);
  if (status === 400) {
    const fields: ChangeFailure['fields'] = {};
    for (const d of details ?? []) {
      if (d.field === 'timeZone') fields.timeZone = text.zoneShape;
      if (d.field === 'country') fields.country = text.countryShape;
    }
    if (Object.keys(fields).length > 0) return { fields, retryable: false };
  }
  if (status === 403) return { fields: {}, line: text.forbidden, retryable: false };
  if (status === 422) return { fields: {}, line: body.timeZone === undefined ? text.inactive : text.openCash, retryable: false };
  if (status === 503) return { fields: {}, line: text.cashUnreadable, retryable: true };
  const trace = traceId ? ` (${messages.errors.trace}: ${traceId})` : '';
  // another refusal of the request itself (a 400 with no field of ours, a 404, a 413) cannot work again with the same body
  const refused = status !== undefined && status >= 400 && status < 500 && status !== 429;
  return { fields: {}, line: `${messages.errors.unavailable}${trace}`, retryable: !refused };
}

export function useChangeLocalization(apiClient: ApiClient) {
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<ChangeFailure | null>(null);
  const [saved, setSaved] = useState(false);
  const current = useRef<AbortController | null>(null);

  // A newer save aborts the older one, and leaving the screen aborts the one in flight (D-01).
  useEffect(() => () => current.current?.abort(), []);

  // Resolves with the tenant the service answered, or null when the save did not go through.
  async function submit(body: LocalizationChange): Promise<TenantResponse | null> {
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    setSending(true);
    setFailure(null);
    setSaved(false);
    try {
      const answer = await changeLocalization(apiClient, body, controller.signal);
      if (controller.signal.aborted) return null;
      setSaved(true);
      return answer;
    } catch (error) {
      if (!controller.signal.aborted) setFailure(mapError(error, body));
      return null;
    } finally {
      if (!controller.signal.aborted) setSending(false);
    }
  }

  return { sending, failure, saved, submit };
}
