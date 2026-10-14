import { useState, type FormEvent } from 'react';
import type { ApiClient, Scope, Session } from '../contract';
import { messages } from '../messages';
import { AuthCard } from '../ui/AuthCard';
import { Field } from '../ui/Field';
import { PasswordField } from '../ui/PasswordField';
import { isCompanyIdentifier, isValidIdentifier } from '../data/security';
import { focusField } from '../ui/focus';
import { NavLink } from '../ui/navigation';
import { useSignIn, type TeamProfile } from './useSignIn';

export interface SignInScreenProps {
  // Identifier of the company link; absent means the platform sign-in (or the general one, by `scope`).
  identifier?: string;
  // 'general' asks for the company; absent keeps the older rule (no identifier means platform).
  scope?: Scope;
  apiClient: ApiClient;
  session: Session;
  // Shown as a success line, e.g. after the first password was saved.
  notice?: string;
  // Company typed before, e.g. when the person comes back from the sign-up.
  initialCompany?: string;
  // Called after a good answer was handed to the session, with the company it was for (typed or from the link).
  onSignedIn?: (company?: string) => void;
  // When given, the 'Crear cuenta' link calls it instead of navigating (the container owns real routes).
  onCreateAccount?: (company?: string) => void;
}

export function SignInScreen({ identifier, scope, apiClient, session, notice, initialCompany = '', onSignedIn, onCreateAccount }: SignInScreenProps) {
  const effective: Scope = scope ?? (identifier === undefined ? 'platform' : 'tenant');
  const general = effective === 'general';
  const platform = effective === 'platform';
  const { sending, failure, submit } = useSignIn(identifier, apiClient, session, general);
  const [company, setCompany] = useState(initialCompany);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ company?: string; email?: string; password?: string }>({});
  // The tab only changes the copy: both call the same company session endpoint (Mockup login.html). `?tab=operador`
  // preselects it.
  const [operator, setOperator] = useState(() => new URLSearchParams(window.location.search).get('tab') === 'operador');
  const [teamProfile, setTeamProfile] = useState<TeamProfile>('admin');

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const typed = company.trim();
    const found = {
      company: !general ? undefined : !typed ? messages.errors.companyRequired : isCompanyIdentifier(typed) ? undefined : messages.errors.companyShape,
      email: email.trim() ? undefined : messages.errors.emailRequired,
      password: password ? undefined : messages.errors.passwordRequired,
    };
    setErrors(found);
    const first = found.company ? 'signin-company' : found.email ? 'signin-email' : found.password ? 'signin-password' : null;
    if (first) {
      focusField(first);
      return;
    }
    const target = general ? typed : identifier;
    // The profile is only checked on the operator tab; it is never sent.
    if (await submit({ email: email.trim(), password }, target, !platform && operator ? teamProfile : undefined)) {
      setPassword('');
      onSignedIn?.(target);
    }
  }

  // An empty or malformed identifier is never sent anywhere (hooks above run in every case).
  if (identifier !== undefined && !isValidIdentifier(identifier)) {
    return <AuthCard title={messages.notFound.title} subtitle={messages.notFound.subtitle}>{null}</AuthCard>;
  }

  const signUpHref = platform ? undefined : general ? '/ingresar' : `/t/${identifier}/sign-up`;
  const text = platform ? messages.platform : messages.signIn;
  const tabs = messages.signIn.tabs;
  return (
    <AuthCard
      kicker={platform ? messages.platform.kicker : undefined}
      eyebrow={platform ? undefined : messages.signIn.kicker}
      homeHref={platform ? undefined : general ? '/' : `/t/${identifier}`}
      title={text.title}
      subtitle={!platform && operator ? messages.signIn.operatorSubtitle : text.subtitle}
    >
      {!platform && (
        <div className="auth-tabs" role="group" aria-label={tabs.label}>
          <button type="button" className="auth-tab" aria-pressed={!operator} onClick={() => setOperator(false)}>
            {tabs.customer}
          </button>
          <button type="button" className="auth-tab" aria-pressed={operator} onClick={() => setOperator(true)}>
            {tabs.operator}
          </button>
        </div>
      )}
      {!platform && operator && (
        <div className="auth-subrole">
          <span id="signin-team-role" className="auth-subrole-label">
            {messages.signIn.teamRole.label}
          </span>
          <div className="auth-tabs auth-tabs--sub" role="group" aria-labelledby="signin-team-role">
            {(['admin', 'staff'] as const).map((profile) => (
              <button key={profile} type="button" className="auth-tab" aria-pressed={teamProfile === profile} onClick={() => setTeamProfile(profile)}>
                {messages.signIn.teamRole[profile]}
              </button>
            ))}
          </div>
        </div>
      )}
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {general && (
          <Field
            id="signin-company"
            label={messages.errors.companyLabel}
            autoComplete="organization"
            placeholder={messages.errors.companyPlaceholder}
            value={company}
            error={errors.company}
            onChange={(e) => setCompany(e.target.value)}
          />
        )}
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
        <p className={failure ? 'auth-feedback is-error' : 'auth-feedback is-success'} aria-live="polite" role={!failure && notice ? 'status' : undefined}>
          {failure ?? notice}
        </p>
        <button className={platform ? 'auth-submit' : 'auth-submit auth-submit--arrow'} type="submit" disabled={sending}>
          {sending ? messages.sending : text.submit}
        </button>
      </form>
      {signUpHref === undefined ? (
        <p className="auth-back">
          <NavLink className="auth-link" href="/ingresar">
            {messages.platform.back}
          </NavLink>
        </p>
      ) : (
        <>
          <p className="auth-platform-entry">
            <NavLink href="/platform">{messages.signIn.platformEntry}</NavLink>
          </p>
          {operator ? (
            <p className="auth-footer">{messages.signIn.staffAccess}</p>
          ) : (
            <p className="auth-footer">
              {messages.signIn.noAccount}{' '}
              <a
                href={signUpHref}
                onClick={(e) => {
                  if (!onCreateAccount) return;
                  e.preventDefault();
                  const typed = company.trim();
                  onCreateAccount(general && isCompanyIdentifier(typed) ? typed : undefined);
                }}
              >
                {messages.signIn.createAccount}
              </a>
            </p>
          )}
        </>
      )}
    </AuthCard>
  );
}
