import { useEffect, useState, type FormEvent } from 'react';
import type { ApiClient } from '../contract';
import { messages } from '../messages';
import { AuthCard } from '../ui/AuthCard';
import { Field } from '../ui/Field';
import { focusField } from '../ui/focus';
import { PasswordField } from '../ui/PasswordField';
import type { RegisterField } from './registerErrors';
import { useRegisterCustomer } from './useRegisterCustomer';

export interface RegisterScreenProps {
  // Company of the link; it is never typed (RN-CAL-IDN-01).
  identifier?: string;
  apiClient: ApiClient;
  // Called once the account exists; the caller sends the person to sign-in.
  onDone: () => void;
  onSignIn: () => void;
}

const text = messages.signUp;
const ids: Record<RegisterField, string> = {
  firstName: 'signup-first-name',
  lastName: 'signup-last-name',
  email: 'signup-email',
  phone: 'signup-phone',
  password: 'signup-password',
  passwordConfirmation: 'signup-password-confirm',
};
// Order of the form, to put the focus on the first field with an error.
const order: RegisterField[] = ['firstName', 'lastName', 'email', 'phone', 'password', 'passwordConfirmation'];

export function RegisterScreen({ identifier, apiClient, onDone, onSignIn }: RegisterScreenProps) {
  const { sending, failure, submit } = useRegisterCustomer(identifier, apiClient);
  const [values, setValues] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', passwordConfirmation: '' });
  const [local, setLocal] = useState<Partial<Record<RegisterField, string>>>({});
  const set = (field: RegisterField) => (e: { target: { value: string } }) => setValues({ ...values, [field]: e.target.value });
  // `local` holds explicit undefined values, so each field is read on its own instead of spreading.
  const errors = Object.fromEntries(order.map((f) => [f, local[f] ?? failure?.fields[f]])) as Partial<Record<RegisterField, string>>;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found: Partial<Record<RegisterField, string>> = {
      firstName: values.firstName.trim() ? undefined : text.firstNameRequired,
      lastName: values.lastName.trim() ? undefined : text.lastNameRequired,
      email: values.email.trim() ? undefined : messages.errors.emailRequired,
      phone: values.phone.trim() ? undefined : text.phoneRequired,
      password: values.password ? undefined : messages.errors.passwordRequired,
      passwordConfirmation: values.password && values.password !== values.passwordConfirmation ? text.mismatch : undefined,
    };
    setLocal(found);
    const first = order.find((f) => found[f]);
    if (first) {
      focusField(ids[first]);
      return;
    }
    const body = { ...values, firstName: values.firstName.trim(), lastName: values.lastName.trim(), email: values.email.trim(), phone: values.phone.trim() };
    // Cleared as soon as they are sent; never kept (RN-SEC-PT-17).
    setValues({ ...values, password: '', passwordConfirmation: '' });
    if (await submit(body)) onDone();
  }

  useEffect(() => {
    const first = failure && order.find((f) => failure.fields[f]);
    if (first) focusField(ids[first]);
  }, [failure]);

  return (
    <AuthCard title={text.title} subtitle={text.subtitle} wide eyebrow={messages.signIn.kicker} homeHref={`/t/${identifier}`} visualTitle={text.visual}>
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {askCompany && (
          <Field id="signup-company" label={messages.errors.companyLabel} autoComplete="organization" placeholder={messages.errors.companyPlaceholder} value={company} error={companyError} onChange={(e) => setCompany(e.target.value)} />
        )}
        <div className="auth-section" role="group" aria-labelledby="signup-personal-title">
          <h2 id="signup-personal-title" className="auth-section-title">{text.personalData}</h2>
          <div className="auth-name-group">
            <Field id={ids.firstName} label={text.firstName} autoComplete="given-name" placeholder={text.firstNamePlaceholder} value={values.firstName} error={errors.firstName} onChange={set('firstName')} />
            <Field id={ids.lastName} label={text.lastName} autoComplete="family-name" placeholder={text.lastNamePlaceholder} value={values.lastName} error={errors.lastName} onChange={set('lastName')} />
          </div>
          <Field id={ids.email} label={messages.fields.email} type="email" autoComplete="email" placeholder={messages.fields.emailPlaceholder} value={values.email} error={errors.email} onChange={set('email')} />
          <Field id={ids.phone} label={text.phone} type="tel" autoComplete="tel" placeholder={text.phonePlaceholder} value={values.phone} error={errors.phone} onChange={set('phone')} />
        </div>
        <div className="auth-section" role="group" aria-labelledby="signup-security-title">
          <h2 id="signup-security-title" className="auth-section-title">{text.security}</h2>
          <PasswordField id={ids.password} label={messages.fields.password} autoComplete="new-password" value={values.password} error={errors.password} aria-describedby="signup-policy" onChange={set('password')} />
          <PasswordField id={ids.passwordConfirmation} label={text.confirmPassword} autoComplete="new-password" value={values.passwordConfirmation} error={errors.passwordConfirmation} onChange={set('passwordConfirmation')} />
          <div className="auth-policy" id="signup-policy" role="group" aria-labelledby="signup-policy-title">
            <p id="signup-policy-title">{text.policyTitle}</p>
            <ul>
              {text.policy.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className={failure?.line ? 'auth-feedback is-error' : 'auth-feedback'} aria-live="polite">
          {failure?.line}
        </p>
        <button className="auth-submit" type="submit" disabled={sending}>
          {sending ? text.sending : text.submit}
        </button>
      </form>
      <div className="auth-divider" />
      <p className="auth-footer">
        {text.haveAccount}{' '}
        <button type="button" className="auth-link" onClick={onSignIn}>
          {text.signIn}
        </button>
      </p>
    </AuthCard>
  );
}
