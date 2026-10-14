import { messages } from '../messages';
import { AuthCard } from '../ui/AuthCard';

export interface RecoverNoticeProps {
  identifier?: string;
  onSignIn: () => void;
  onCreateAccount: () => void;
}

// Notice of the Mockup `recuperar.html`: recovery itself waits for HU-SEC-004, so it makes no request.
export function RecoverNotice({ identifier, onSignIn, onCreateAccount }: RecoverNoticeProps) {
  const text = messages.recover;
  return (
    <AuthCard title={text.title} eyebrow={messages.signIn.kicker} homeHref={identifier ? `/t/${identifier}` : '/'}>
      <p className="auth-feedback" role="status">
        {text.notice}
      </p>
      <p className="auth-footer">{text.detail}</p>
      <button className="auth-submit" type="button" onClick={onSignIn}>
        {text.backToSignIn}
      </button>
      <p className="auth-footer">
        <button type="button" className="auth-link" onClick={onCreateAccount}>
          {text.createAccount}
        </button>
      </p>
    </AuthCard>
  );
}
