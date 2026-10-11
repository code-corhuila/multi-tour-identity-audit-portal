import { useState, type FormEvent } from 'react';
import type { ApiClient, Session } from '../contract';
import { messages } from '../messages';
import { AuthCard } from '../ui/AuthCard';
import { Field } from '../ui/Field';
import { PasswordField } from '../ui/PasswordField';
import { isValidIdentifier } from '../data/security';
import { useSignIn } from './useSignIn';

export interface SignInScreenProps {
  // Identifier of the company link; absent means the platform sign-in.
  identifier?: string;
  apiClient: ApiClient;
  session: Session;
}

export function SignInScreen({ identifier, apiClient, session }: SignInScreenProps) {
  const platform = identifier === undefined;
  const { sending, failure, submit } = useSignIn(identifier, apiClient, session);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found = {
      email: email.trim() ? undefined : messages.errors.emailRequired,
      password: password ? undefined : messages.errors.passwordRequired,
    };
    setErrors(found);
    if (found.email || found.password) return;
    if (await submit({ email: email.trim(), password })) setPassword('');
  }

  // An empty or malformed identifier is never sent anywhere (hooks above run in every case).
  if (identifier !== undefined && !isValidIdentifier(identifier)) {
    return <AuthCard title={messages.notFound.title} subtitle={messages.notFound.subtitle}>{null}</AuthCard>;
  }

  const signUpHref = identifier === undefined ? undefined : `/t/${identifier}/sign-up`;
  const text = platform ? messages.platform : messages.signIn;
  return (
    <AuthCard
      kicker={platform ? messages.platform.kicker : undefined}
      title={text.title}
      subtitle={text.subtitle}
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <Field
          id="signin-email"
          label={messages.fields.email}
          type="email"
          autoComplete="email"
          placeholder={messages.fields.emailPlaceholder}
          value={email}
          error={errors.email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordField
          id="signin-password"
          label={messages.fields.password}
          autoComplete="current-password"
          value={password}
          error={errors.password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className={failure ? 'auth-feedback is-error' : 'auth-feedback'} aria-live="polite">
          {failure}
        </p>
        <button className="auth-submit" type="submit" disabled={sending}>
          {sending ? messages.sending : text.submit}
        </button>
      </form>
      {signUpHref === undefined ? (
        <p className="auth-back">
          <a className="auth-link" href="/">
            {messages.platform.back}
          </a>
        </p>
      ) : (
        <>
          <div className="auth-divider" />
          <p className="auth-footer">
            {messages.signIn.noAccount} <a href={signUpHref}>{messages.signIn.createAccount}</a>
          </p>
        </>
      )}
    </AuthCard>
  );
}
