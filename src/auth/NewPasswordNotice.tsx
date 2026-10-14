import { useState, type FormEvent } from 'react';
import { messages } from '../messages';
import { AuthCard } from '../ui/AuthCard';
import { PasswordField } from '../ui/PasswordField';

export interface NewPasswordNoticeProps {
  identifier?: string;
  onSignIn: () => void;
}

// Form of the Mockup `nueva-contrasena.html` (2026-10-12) when the session has no temporary credential; with one,
// FirstPasswordScreen takes its place. Visual only: nothing is sent.
export function NewPasswordNotice({ identifier, onSignIn }: NewPasswordNoticeProps) {
  const text = messages.newPasswordNotice;
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [feedback, setFeedback] = useState<{ line: string; error: boolean }>();
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFeedback(password === confirmation ? { line: text.visualOnly, error: false } : { line: text.mismatch, error: true });
  };
  return (
    <AuthCard title={text.title} subtitle={text.subtitle} homeHref={identifier ? `/t/${identifier}` : '/'}>
      <form className="auth-form" onSubmit={onSubmit}>
        <PasswordField id="new-password" label={text.password} autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
        <PasswordField id="new-password-confirmation" label={text.confirmation} autoComplete="new-password" minLength={8} required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
        <p className="auth-footer">{text.rule}</p>
        <p className={feedback?.error ? 'auth-feedback is-error' : 'auth-feedback'} role="status">
          {feedback?.line ?? text.note}
        </p>
        <button className="auth-submit" type="submit">
          {text.submit}
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
