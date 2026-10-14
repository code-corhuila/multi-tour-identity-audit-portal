import { useState, type FormEvent } from 'react';
import { messages } from '../messages';
import { AuthCard } from '../ui/AuthCard';
import { Field } from '../ui/Field';

export interface RecoverNoticeProps {
  identifier?: string;
  onSignIn: () => void;
}

// Form of the Mockup `recuperar.html` (2026-10-12): visual only, the contract has no recovery route (HU-IAM-003).
export function RecoverNotice({ identifier, onSignIn }: RecoverNoticeProps) {
  const text = messages.recover;
  const [email, setEmail] = useState('');
  const [shown, setShown] = useState(false);
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setShown(true);
  };
  return (
    <AuthCard title={text.title} subtitle={text.subtitle} eyebrow={messages.signIn.kicker} homeHref={identifier ? `/t/${identifier}` : '/'}>
      <form className="auth-form" onSubmit={onSubmit}>
        <Field id="recover-email" label={text.email} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <p className="auth-feedback" role="status">
          {shown ? text.visualOnly : text.note}
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
