import { useState, type FormEvent } from 'react';
import type { ApiClient } from '../contract';
import { Field } from '../ui/Field';
import { focusField } from '../ui/focus';
import { PasswordField } from '../ui/PasswordField';
import { tenantMessages } from './messages';
import type { OnboardField } from './onboardErrors';
import { useOnboardTenant } from './useOnboardTenant';
import './operator.css';

const text = tenantMessages.register;

export interface RegisterTenantScreenProps {
  apiClient: ApiClient;
  onBack: () => void;
  // Wait between two reads of a running saga; a prop so the tests do not wait.
  pollMs?: number;
}

type FormField = OnboardField | 'passwordConfirmation';
const ids: Record<FormField, string> = {
  identifier: 'tenant-identifier',
  commercialName: 'tenant-name',
  timeZone: 'tenant-time-zone',
  country: 'tenant-country',
  initialStatus: 'tenant-initial-status',
  fullName: 'tenant-admin-name',
  email: 'tenant-admin-email',
  password: 'tenant-admin-password',
  passwordConfirmation: 'tenant-admin-password-confirm',
};
// Order of the form, to put the focus on the first field with an error.
const order: FormField[] = ['identifier', 'commercialName', 'timeZone', 'country', 'initialStatus', 'fullName', 'email', 'password', 'passwordConfirmation'];
// Same pattern and length as `TenantIdentifier` of identity-audit.yaml.
const IDENTIFIER = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// D-10: the zones come from the platform; the countries are a constant (Colombia only, spec section 6).
const timeZones = Intl.supportedValuesOf('timeZone');

function SelectField({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-input-wrap">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map(([v, name]) => (
            <option key={v} value={v}>
              {name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function RegisterTenantScreen({ apiClient, onBack, pollMs = 1500 }: RegisterTenantScreenProps) {
  const { sending, failure, saga, submit, refresh } = useOnboardTenant(apiClient, pollMs);
  const [values, setValues] = useState({
    identifier: '',
    commercialName: '',
    timeZone: 'America/Bogota',
    country: 'CO',
    initialStatus: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    fullName: '',
    email: '',
    password: '',
    passwordConfirmation: '',
  });
  const [local, setLocal] = useState<Partial<Record<FormField, string>>>({});
  const set = (field: FormField) => (e: { target: { value: string } }) => setValues({ ...values, [field]: e.target.value });
  const errors = Object.fromEntries(order.map((f) => [f, local[f] ?? failure?.fields[f as OnboardField]])) as Partial<Record<FormField, string>>;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const identifier = values.identifier.trim();
    const found: Partial<Record<FormField, string>> = {
      identifier: !identifier ? text.identifierRequired : identifier.length < 3 || identifier.length > 40 || !IDENTIFIER.test(identifier) ? text.identifierShape : undefined,
      commercialName: values.commercialName.trim() ? undefined : text.nameRequired,
      fullName: values.fullName.trim() ? undefined : text.fullNameRequired,
      email: values.email.trim() ? undefined : text.emailRequired,
      password: values.password ? undefined : text.passwordRequired,
      passwordConfirmation: values.password && values.password !== values.passwordConfirmation ? text.mismatch : undefined,
    };
    setLocal(found);
    const first = order.find((f) => found[f]);
    if (first) {
      focusField(ids[first]);
      return;
    }
    const { password } = values;
    // Cleared as soon as it is sent; never kept (RN-IDA-PT-02).
    setValues({ ...values, password: '', passwordConfirmation: '' });
    await submit({
      identifier,
      commercialName: values.commercialName.trim(),
      timeZone: values.timeZone,
      country: values.country,
      initialStatus: values.initialStatus,
      administrator: { fullName: values.fullName.trim(), email: values.email.trim(), password },
    });
  }

  if (saga?.status === 'COMPLETED') {
    return (
      <main className="operator-content">
        <section className="operator-panel" role="status">
          <h2>{text.done}</h2>
          <p>{text.temporary}</p>
          <button type="button" className="operator-outline" onClick={onBack}>
            {text.back}
          </button>
        </section>
      </main>
    );
  }

  const stuck = saga?.status === 'RUNNING' && !sending;
  return (
    <main className="operator-content">
      <header className="operator-topbar">
        <button type="button" className="operator-outline" onClick={onBack}>
          {text.back}
        </button>
        <h1>{text.title}</h1>
      </header>
      <section className="operator-panel">
        <form className="auth-form" onSubmit={onSubmit} noValidate>
          <Field id={ids.identifier} label={text.identifier} autoComplete="off" value={values.identifier} error={errors.identifier} onChange={set('identifier')} />
          <Field id={ids.commercialName} label={text.commercialName} autoComplete="organization" value={values.commercialName} error={errors.commercialName} onChange={set('commercialName')} />
          <SelectField id={ids.timeZone} label={text.timeZone} value={values.timeZone} options={timeZones.map((z): [string, string] => [z, z])} onChange={(v) => setValues({ ...values, timeZone: v })} />
          <SelectField id={ids.country} label={text.country} value={values.country} options={Object.entries(text.countries)} onChange={(v) => setValues({ ...values, country: v })} />
          <SelectField
            id={ids.initialStatus}
            label={text.initialStatus}
            value={values.initialStatus}
            options={Object.entries(text.statuses)}
            onChange={(v) => setValues({ ...values, initialStatus: v as 'ACTIVE' | 'INACTIVE' })}
          />
          <Field id={ids.fullName} label={text.fullName} autoComplete="off" value={values.fullName} error={errors.fullName} onChange={set('fullName')} />
          <Field id={ids.email} label={text.email} type="email" autoComplete="off" value={values.email} error={errors.email} onChange={set('email')} />
          <PasswordField id={ids.password} label={text.password} autoComplete="new-password" value={values.password} error={errors.password} onChange={set('password')} />
          <PasswordField id={ids.passwordConfirmation} label={text.confirmPassword} autoComplete="new-password" value={values.passwordConfirmation} error={errors.passwordConfirmation} onChange={set('passwordConfirmation')} />
          <p>{text.policyHint}</p>
          <div aria-live="polite">
            {failure?.line && <p className="auth-feedback is-error">{failure.line}</p>}
            {saga && saga.status !== 'RUNNING' && (
              <p className="auth-feedback is-error">
                {text.failed} {saga.failedStep && text.steps[saga.failedStep]}
              </p>
            )}
            {stuck && <p>{text.running}</p>}
          </div>
          {stuck && (
            <button type="button" className="operator-outline" onClick={refresh}>
              {text.refresh}
            </button>
          )}
          <button className="operator-primary" type="submit" disabled={sending}>
            {sending ? text.sending : text.submit}
          </button>
        </form>
      </section>
    </main>
  );
}
