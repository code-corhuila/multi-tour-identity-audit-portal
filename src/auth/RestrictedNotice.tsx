import type { Session } from '../contract';
import { messages } from '../messages';
import { AuthCard } from '../ui/AuthCard';

// `onSignOut` lets the caller re-read the session after it is closed; without it the session is only closed.
export function RestrictedNotice({ session, onSignOut }: { session: Session; onSignOut?: () => void }) {
  return (
    <AuthCard title={messages.restricted.title}>
      <p className="auth-feedback" role="status">
        {messages.restricted.notice}
      </p>
      <button className="auth-submit" type="button" onClick={() => (onSignOut ? onSignOut() : session.close())}>
        {messages.restricted.signOut}
      </button>
    </AuthCard>
  );
}
