import { messages } from '../messages';
import { AuthCard } from '../ui/AuthCard';

export interface NewPasswordNoticeProps {
  identifier?: string;
  onSignIn: () => void;
}

// Shown when the session has no temporary credential (Mockup `nueva-contrasena.html`); with one, the form of
// FirstPasswordScreen takes its place.
export function NewPasswordNotice({ identifier, onSignIn }: NewPasswordNoticeProps) {
  const text = messages.newPasswordNotice;
  return (
    <AuthCard title={text.title} homeHref={identifier ? `/t/${identifier}` : '/'}>
      <p className="auth-feedback" role="status">
        {text.notice}
      </p>
      <p className="auth-footer">{text.detail}</p>
      <button className="auth-submit" type="button" onClick={onSignIn}>
        {text.backToSignIn}
      </button>
    </AuthCard>
  );
}
