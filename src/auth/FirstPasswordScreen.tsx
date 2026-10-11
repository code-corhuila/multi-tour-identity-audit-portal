import { useEffect, useState, type FormEvent } from 'react';
import type { ApiClient, Session } from '../contract';
import { messages } from '../messages';
import { AuthCard } from '../ui/AuthCard';
import { focusField } from '../ui/focus';
import { PasswordField } from '../ui/PasswordField';
import { useChooseOwnPassword } from './useChooseOwnPassword';

export interface FirstPasswordScreenProps {
  apiClient: ApiClient;
  session: Session;
  // Called once the password is saved; the caller sends the person back to sign-in.
  onSaved: () => void;
}

const text = messages.firstPassword;

export function FirstPasswordScreen({ apiClient, session, onSaved }: FirstPasswordScreenProps) {
  const { sending, failure, submit } = useChooseOwnPassword(apiClient);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<{ password?: string; confirmation?: string }>({});

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found = {
      password: password ? undefined : text.newRequired,
      confirmation: password && password !== confirmation ? text.mismatch : undefined,
    };
    setError(found);
    if (found.password || found.confirmation) {
      focusField(found.password ? 'first-password' : 'first-password-confirm');
      return;
    }
    const attempt = password;
    // Cleared as soon as they are sent; never kept (RN-SEC-PT-06).
    setPassword('');
    setConfirmation('');
    if (await submit(attempt)) onSaved();
  }

  useEffect(() => {
    if (failure?.kind === 'policy') focusField('first-password');
  }, [failure]);

  // A credential that is no longer valid cannot be fixed here: leave the form, do not offer to resubmit.
  if (failure?.kind === 'expired') {
    return (
      <AuthCard title={text.title}>
        <p className="auth-feedback is-error" role="alert">
          {failure.text}
        </p>
        <button className="auth-submit" type="button" onClick={() => session.close()}>
          {text.backToSignIn}
        </button>
      </AuthCard>
    );
  }

  const policyError = failure?.kind === 'policy' ? failure.text : undefined;
  const line = failure ? (failure.kind === 'policy' ? null : failure.text) : null;
  return (
    <AuthCard title={text.title} subtitle={text.subtitle}>
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <PasswordField
          id="first-password"
          label={text.newPassword}
          autoComplete="new-password"
          value={password}
          error={error.password ?? policyError}
          aria-describedby="first-password-policy"
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordField
          id="first-password-confirm"
          label={text.confirmPassword}
          autoComplete="new-password"
          value={confirmation}
          error={error.confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
        <div className="auth-policy" id="first-password-policy" role="group" aria-labelledby="first-password-policy-title">
          <p id="first-password-policy-title">{text.policyTitle}</p>
          <ul>
            {text.policy.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
        <p className={line ? 'auth-feedback is-error' : 'auth-feedback'} aria-live="polite">
          {line}
        </p>
        <button className="auth-submit" type="submit" disabled={sending}>
          {sending ? text.sending : text.submit}
        </button>
      </form>
      <p className="auth-back">
        <button type="button" className="auth-link" onClick={() => session.close()}>
          {text.backToSignIn}
        </button>
      </p>
    </AuthCard>
  );
}
