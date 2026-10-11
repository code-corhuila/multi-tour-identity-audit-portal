import type { Session } from '../contract';
import { messages } from '../messages';
import { AuthCard } from '../ui/AuthCard';

export function RestrictedNotice({ session }: { session: Session }) {
  return (
    <AuthCard title={messages.restricted.title}>
      <p className="auth-feedback" role="status">
        {messages.restricted.notice}
      </p>
      <button className="auth-submit" type="button" onClick={() => session.close()}>
        {messages.restricted.signOut}
      </button>
    </AuthCard>
  );
}
