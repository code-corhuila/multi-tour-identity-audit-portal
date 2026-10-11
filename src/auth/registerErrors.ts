import type { ApiError } from '../contract';
import { messages } from '../messages';

export type RegisterField = keyof typeof messages.signUp.fieldRefused;

export interface RegisterFailure {
  // Errors that belong beside a field.
  fields: Partial<Record<RegisterField, string>>;
  // Errors that do not (the message line).
  line?: string;
}

const text = messages.signUp;
const known = (field: string): field is RegisterField => field in text.fieldRefused;

// The status and the field decide the text, never the answer's message. The two 422 refusals (e-mail in use and
// inactive company) share a status and a code, so the e-mail one is told apart by the field the service names.
export function mapRegisterError(error: unknown): RegisterFailure {
  const { status, traceId, details } = (error ?? {}) as ApiError;
  const named = (details ?? []).map((d) => d.field).filter(known);
  if (status === 400 && named.length > 0) {
    return { fields: Object.fromEntries(named.map((f) => [f, text.fieldRefused[f]])) };
  }
  if (status === 422) {
    return named.includes('email') ? { fields: { email: text.emailInUse } } : { fields: {}, line: text.unavailableForCompany };
  }
  const trace = traceId ? ` (${messages.errors.trace}: ${traceId})` : '';
  return { fields: {}, line: `${messages.errors.unavailable}${trace}` };
}
