import type { ApiClient } from '../contract';
import { messages } from '../messages';
import { AuthCard } from '../ui/AuthCard';
import { useRequestLink } from './useRequestLink';

export interface CheckEmailNoticeProps {
  identifier: string;
  // Commercial name of the company, or its identifier when the container gives none.
  company: string;
  email: string;
  apiClient: ApiClient;
  onSignIn: () => void;
}

const text = messages.verifyEmail;

// Screen A of portal spec 013: what the person sees once the account exists (it waits for its e-mail).
export function CheckEmailNotice({ identifier, company, email, apiClient, onSignIn }: CheckEmailNoticeProps) {
  const { result, submit } = useRequestLink(identifier, apiClient);
  const sending = result.state === 'sending';
  const line = result.state === 'sent' ? text.sent : result.state === 'failed' ? (result.line ?? result.field) : undefined;
  return (
    <AuthCard title={text.title} eyebrow={messages.signIn.kicker} homeHref={`/t/${identifier}`}>
      <p>
        {text.created} <strong>{company}</strong> {text.sentTo} <strong>{email}</strong>. {text.inactive} <strong>{text.inactiveWord}</strong>{' '}
        {text.untilOpened}
      </p>
      <p className={result.state === 'failed' ? 'auth-feedback is-error' : 'auth-feedback'} aria-live="polite">
        {line}
      </p>
      <button className="auth-submit" type="button" disabled={sending} onClick={() => void submit(email)}>
        {sending ? messages.requestLink.sending : text.resend}
      </button>
      <p className="auth-footer">
        <button type="button" className="auth-link" onClick={onSignIn}>
          {text.goToSignIn}
        </button>
      </p>
    </AuthCard>
  );
}
