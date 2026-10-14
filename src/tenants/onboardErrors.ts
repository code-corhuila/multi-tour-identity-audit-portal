import type { ApiError } from '../contract';
import { messages } from '../messages';
import { tenantMessages } from './messages';

export type OnboardField = keyof typeof tenantMessages.register.fieldRefused;

export interface OnboardFailure {
  // Errors that belong beside a field.
  fields: Partial<Record<OnboardField, string>>;
  // Errors that do not (the message line).
  line?: string;
}

const refused = tenantMessages.register.fieldRefused;
const known = (field: string): field is OnboardField => field in refused;

// The status and the field decide the text, never the answer's message. The service names a field of the
// administrator as `administrator.email`; the form's fields are flat, so the prefix is dropped.
export function mapOnboardError(error: unknown): OnboardFailure {
  const { status, traceId, details } = (error ?? {}) as ApiError;
  const named = (details ?? []).map((d) => d.field.replace(/^administrator\./, '')).filter(known);
  if (status === 400 && named.length > 0) {
    return { fields: Object.fromEntries(named.map((f) => [f, refused[f]])) };
  }
  const trace = traceId ? ` (${messages.errors.trace}: ${traceId})` : '';
  return { fields: {}, line: `${messages.errors.unavailable}${trace}` };
}
