import { useState, type FormEvent } from 'react';
import type { ApiClient } from '../contract';
import { messages } from '../messages';
import { AuthCard } from '../ui/AuthCard';
import { Field } from '../ui/Field';
import { focusField } from '../ui/focus';
import { PasswordField } from '../ui/PasswordField';
import { useResetPassword, type ResetField } from './useResetPassword';

export interface ResetPasswordScreenProps {
  // Company of the link; undefined at the platform. It is never typed (RN-CAL-IDN-01).
  identifier: string | undefined;
  apiClient: ApiClient;
  // The e-mail typed on the previous screen.
  initialEmail?: string;
  onSignIn: () => void;
  // A code that does not work is solved by asking for another one.
  onAskAgain: () => void;
}

const text = messages.reset;
const ids: Record<ResetField, string> = {
  email: 'reset-email',
  code: 'reset-code',
  newPassword: 'reset-password',
  newPasswordConfirmation: 'reset-password-confirm',
};

// Screen of portal spec 016: the e-mail, the code, the new password and its confirmation go in one call. The code and the
// passwords live only in the state of this form: never in storage, the address bar or a log (RN-PT-16-04).
export function ResetPasswordScreen({ identifier, apiClient, initialEmail, onSignIn, onAskAgain }: ResetPasswordScreenProps) {
  const { result, submit } = useResetPassword(identifier, apiClient);
  const [email, setEmail] = useState(initialEmail ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [local, setLocal] = useState<Partial<Record<ResetField, string>>>({});
  const sending = result.state === 'sending';
  const refused = result.state === 'failed' && result.refused;
  const remote = result.state === 'failed' ? (result.fields ?? {}) : {};
  const error = (field: ResetField) => local[field] ?? remote[field];

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    // The screen warns early; the service decides (RN-PT-16-02).
    const found: Partial<Record<ResetField, string>> = {
      email: email.trim() ? undefined : messages.errors.emailRequired,
      code: /^[0-9]{8}$/.test(code.trim()) ? undefined : text.codeShape,
      newPassword: password ? undefined : messages.firstPassword.newRequired,
      newPasswordConfirmation: password && password !== confirmation ? messages.firstPassword.mismatch : undefined,
    };
    setLocal(found);
    const first = (Object.keys(ids) as ResetField[]).find((f) => found[f]);
    if (first) {
      focusField(ids[first]);
      return;
    }
    await submit({ email: email.trim(), code: code.trim(), newPassword: password, newPasswordConfirmation: confirmation });
    // Cleared as soon as the answer is here, whatever it was; the rest of the form stays so the person can correct it.
    setPassword('');
    setConfirmation('');
  }

  if (result.state === 'done') {
    return (
      <AuthCard title={text.title} subtitle={text.subtitle}>
        <p className="auth-feedback is-success" role="status">
          {text.done}
        </p>
        <button className="auth-submit" type="button" onClick={onSignIn}>
          {text.signIn}
        </button>
      </AuthCard>
    );
  }

  const line = result.state === 'failed' ? (refused ? text.codeRefused : result.line) : undefined;
  return (
    <AuthCard title={text.title} subtitle={text.subtitle} eyebrow={messages.signIn.kicker} homeHref={identifier ? `/t/${identifier}` : '/'}>
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <Field id={ids.email} label={messages.recover.email} type="email" autoComplete="email" value={email} error={error('email')} onChange={(e) => setEmail(e.target.value)} />
        <Field
          id={ids.code}
          label={text.code}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
          value={code}
          error={error('code')}
          onChange={(e) => setCode(e.target.value)}
        />
        <PasswordField
          id={ids.newPassword}
          label={messages.firstPassword.newPassword}
          autoComplete="new-password"
          value={password}
          error={error('newPassword')}
          aria-describedby="reset-password-policy"
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordField
          id={ids.newPasswordConfirmation}
          label={messages.firstPassword.confirmPassword}
          autoComplete="new-password"
          value={confirmation}
          error={error('newPasswordConfirmation')}
          onChange={(e) => setConfirmation(e.target.value)}
        />
        <div className="auth-policy" id="reset-password-policy" role="group" aria-labelledby="reset-password-policy-title">
          <p id="reset-password-policy-title">{messages.firstPassword.policyTitle}</p>
          <ul>
            {messages.firstPassword.policy.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
        <p className={line ? 'auth-feedback is-error' : 'auth-feedback'} aria-live="polite">
          {line ?? text.note}
        </p>
        <button className="auth-submit" type="submit" disabled={sending}>
          {sending ? text.sending : text.submit}
        </button>
      </form>
      {refused && (
        <p className="auth-footer">
          <button type="button" className="auth-link" onClick={onAskAgain}>
            {text.askAgain}
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
