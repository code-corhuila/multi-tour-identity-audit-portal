import { useState, type FormEvent } from 'react';
import type { ApiClient } from '../contract';
import { messages } from '../messages';
import { AuthCard } from '../ui/AuthCard';
import { Field } from '../ui/Field';
import { focusField } from '../ui/focus';
import { useRequestRecovery } from './useRequestRecovery';

export interface RecoverScreenProps {
  // Company of the link; undefined at the platform. It is never typed (RN-CAL-IDN-01).
  identifier: string | undefined;
  apiClient: ApiClient;
  onSignIn: () => void;
  // The person already has the code: the next screen starts with the e-mail typed here. Without it the way is not offered.
  onHaveCode?: (email: string) => void;
}

const text = messages.recover;
const emailId = 'recover-email';

// Screen of portal spec 016: whatever the e-mail, a 202 ends with the same sentence and a way to the next screen.
export function RecoverScreen({ identifier, apiClient, onSignIn, onHaveCode }: RecoverScreenProps) {
  const { result, submit } = useRequestRecovery(identifier, apiClient);
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

  const line = result.state === 'sent' ? text.sent : result.state === 'failed' ? result.line : undefined;
  return (
    <AuthCard title={text.title} subtitle={text.subtitle} eyebrow={messages.signIn.kicker} homeHref={identifier ? `/t/${identifier}` : '/'}>
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <Field id={emailId} label={text.email} type="email" autoComplete="email" value={email} error={error} onChange={(e) => setEmail(e.target.value)} />
        <p className={result.state === 'failed' && result.line ? 'auth-feedback is-error' : 'auth-feedback'} aria-live="polite">
          {line ?? text.note}
        </p>
        <button className="auth-submit" type="submit" disabled={sending}>
          {sending ? text.sending : text.submit}
        </button>
      </form>
      {result.state === 'sent' && onHaveCode && (
        <p className="auth-footer">
          <button type="button" className="auth-link" onClick={() => onHaveCode(email.trim())}>
            {text.haveCode}
          </button>
        </p>
      )}
      <p className="auth-footer">
        <button type="button" className="auth-link" onClick={onSignIn}>
          {text.backToSignIn}
        </button>
      </p>
    </AuthCard>
  );
}
