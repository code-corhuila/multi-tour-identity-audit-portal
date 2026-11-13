import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ApiClient, ApiError } from '../contract';
import { confirmEmailVerification } from '../data/security';
import { messages } from '../messages';
import { AuthCard } from '../ui/AuthCard';
import { focusField } from '../ui/focus';
import { PasswordField } from '../ui/PasswordField';

export interface VerifyEmailScreenProps {
  identifier: string;
  apiClient: ApiClient;
  // The value of the link, read once from the address; absent when the person opened the page without it.
  token?: string;
  onSignIn: () => void;
  onRequestLink: () => void;
}

const text = messages.verifyPage;
const passwordId = 'verify-password';

type Step = { name: 'form'; field?: string; line?: string } | { name: 'sending' } | { name: 'verified' } | { name: 'bad-link' };

// The status decides the text, never the message of the answer. A 401 is the password, a 422 is a link that expired or was
// used; the link is kept for a retry only in the first case.
function describeFailure(error: unknown): Step {
  const { status, traceId } = (error ?? {}) as ApiError;
  if (status === 401) return { name: 'form', field: text.wrongPassword };
  if (status === 422) return { name: 'bad-link' };
  const trace = traceId ? ` (${messages.errors.trace}: ${traceId})` : '';
  return { name: 'form', line: `${messages.errors.unavailable}${trace}` };
}

// Screens D, E and F of portal spec 013. The page opens no session: it only confirms (RN-SEC-PT-36).
export function VerifyEmailScreen({ identifier, apiClient, token, onSignIn, onRequestLink }: VerifyEmailScreenProps) {
  const [step, setStep] = useState<Step>(token ? { name: 'form' } : { name: 'bad-link' });
  const [password, setPassword] = useState('');
  const [missing, setMissing] = useState(false);
  const current = useRef<AbortController | null>(null);

  useEffect(() => () => current.current?.abort(), []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token || step.name === 'sending') return;
    if (!password) {
      setMissing(true);
      focusField(passwordId);
      return;
    }
    setMissing(false);
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    const sent = password;
    setPassword('');
    setStep({ name: 'sending' });
    try {
      await confirmEmailVerification(apiClient, identifier, token, sent, controller.signal);
      if (!controller.signal.aborted) setStep({ name: 'verified' });
    } catch (error) {
      if (controller.signal.aborted) return;
      const next = describeFailure(error);
      setStep(next);
      if (next.name === 'form' && next.field) focusField(passwordId);
    }
  }

  const home = `/t/${identifier}`;
  if (step.name === 'verified') {
    return (
      <AuthCard title={text.doneTitle} subtitle={text.done} eyebrow={messages.signIn.kicker} homeHref={home}>
        <button className="auth-submit" type="button" onClick={onSignIn}>
          {text.signIn}
        </button>
      </AuthCard>
    );
  }
  if (step.name === 'bad-link') {
    return (
      <AuthCard title={text.badLinkTitle} subtitle={text.badLink} eyebrow={messages.signIn.kicker} homeHref={home}>
        <button className="auth-submit" type="button" onClick={onRequestLink}>
          {text.newLink}
        </button>
      </AuthCard>
    );
  }
  const sending = step.name === 'sending';
  const error = missing ? messages.errors.passwordRequired : step.name === 'form' ? step.field : undefined;
  const line = step.name === 'form' ? step.line : undefined;
  return (
    <AuthCard title={messages.verifyEmail.title} subtitle={text.subtitle} eyebrow={messages.signIn.kicker} homeHref={home}>
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <PasswordField id={passwordId} label={messages.fields.password} autoComplete="current-password" value={password} error={error} onChange={(e) => {
            setPassword(e.target.value);
            setMissing(false);
          }} />
        <p className={line ? 'auth-feedback is-error' : 'auth-feedback'} aria-live="polite">
          {line}
        </p>
        <button className="auth-submit" type="submit" disabled={sending}>
          {sending ? text.sending : text.submit}
        </button>
      </form>
    </AuthCard>
  );
}
