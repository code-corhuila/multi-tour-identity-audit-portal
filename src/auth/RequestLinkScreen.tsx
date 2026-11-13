import { useState, type FormEvent } from 'react';
import type { ApiClient } from '../contract';
import { messages } from '../messages';
import { AuthCard } from '../ui/AuthCard';
import { Field } from '../ui/Field';
import { focusField } from '../ui/focus';
import { useRequestLink } from './useRequestLink';

export interface RequestLinkScreenProps {
  // Company of the link; it is never typed (RN-CAL-IDN-01).
  identifier: string;
  apiClient: ApiClient;
  onSignIn: () => void;
}

const text = messages.requestLink;
const emailId = 'request-link-email';

// Screen C of portal spec 013: whatever the e-mail, a 202 ends with the same sentence.
export function RequestLinkScreen({ identifier, apiClient, onSignIn }: RequestLinkScreenProps) {
  const { result, submit } = useRequestLink(identifier, apiClient);
  const [email, setEmail] = useState('');
  const [local, setLocal] = useState<string>();
  const sending = result.state === 'sending';
  const error = local ?? (result.state === 'failed' ? result.field : undefined);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const missing = email.trim() ? undefined : messages.errors.emailRequired;
    setLocal(missing);
    if (missing) {
      focusField(emailId);
      return;
    }
    await submit(email.trim());
  }

  const line = result.state === 'sent' ? messages.verifyEmail.sent : result.state === 'failed' ? result.line : undefined;
  return (
    <AuthCard title={text.title} subtitle={text.subtitle} eyebrow={messages.signIn.kicker} homeHref={`/t/${identifier}`}>
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <Field id={emailId} label={messages.fields.email} type="email" autoComplete="email" placeholder={messages.fields.emailPlaceholder} value={email} error={error} onChange={(e) => setEmail(e.target.value)} />
        <p className={result.state === 'failed' && result.line ? 'auth-feedback is-error' : 'auth-feedback'} aria-live="polite">
          {line}
        </p>
        <button className="auth-submit" type="submit" disabled={sending}>
          {sending ? text.sending : text.submit}
        </button>
      </form>
      <p className="auth-footer">
        <button type="button" className="auth-link" onClick={onSignIn}>
          {text.backToSignIn}
        </button>
      </p>
    </AuthCard>
  );
}
