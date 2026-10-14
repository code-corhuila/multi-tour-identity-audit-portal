import { useState, type FormEvent } from 'react';
import type { ApiClient } from '../contract';
import { Field } from '../ui/Field';
import { focusField } from '../ui/focus';
import { PasswordField } from '../ui/PasswordField';
import { SelectField } from '../ui/SelectField';
import { tenantMessages } from '../tenants/messages';
import type { OnboardField } from '../tenants/onboardErrors';
import { validateRegister, type RegisterFormField } from '../tenants/registerValidation';
import { useOnboardTenant } from '../tenants/useOnboardTenant';
import { platformMessages } from './messages';
import { PageHeader } from './PageHeader';

const t = platformMessages.createOperator;
const text = tenantMessages.register;

type FormField = OnboardField | 'passwordConfirmation';
const ids: Record<FormField, string> = {
  identifier: 'create-identifier',
  commercialName: 'create-name',
  timeZone: 'create-time-zone',
  country: 'create-country',
  initialStatus: 'create-initial-status',
  fullName: 'create-admin-name',
  email: 'create-admin-email',
  password: 'create-admin-password',
  passwordConfirmation: 'create-admin-password-confirm',
};
// Order of the form, to put the focus on the first field with an error.
const order: FormField[] = ['commercialName', 'identifier', 'timeZone', 'country', 'initialStatus', 'fullName', 'email', 'password', 'passwordConfirmation'];
const timeZones = Intl.supportedValuesOf('timeZone');

export interface CreateOperatorViewProps {
  apiClient: ApiClient;
  onBack: () => void;
  // Wait between two reads of a running saga; a prop so the tests do not wait.
  pollMs?: number;
}

// Create-operator view of the platform panel: the Mockup's two sections over the registration saga of portal 001.
export function CreateOperatorView({ apiClient, onBack, pollMs = 1500 }: CreateOperatorViewProps) {
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
  const [local, setLocal] = useState<Partial<Record<RegisterFormField, string>>>({});
  const set = (field: FormField) => (e: { target: { value: string } }) => setValues({ ...values, [field]: e.target.value });
  const errors = (field: FormField) => local[field as RegisterFormField] ?? failure?.fields[field as OnboardField];

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validateRegister(values);
    setLocal(found);
    const first = order.find((f) => found[f as RegisterFormField]);
    if (first) {
      focusField(ids[first]);
      return;
    }
    const { password } = values;
    // Cleared as soon as it is sent; never kept (RN-IDA-PT-02).
    setValues({ ...values, password: '', passwordConfirmation: '' });
    await submit({
      identifier: values.identifier.trim(),
      commercialName: values.commercialName.trim(),
      timeZone: values.timeZone,
      country: values.country,
      initialStatus: values.initialStatus,
      administrator: { fullName: values.fullName.trim(), email: values.email.trim(), password },
    });
  }

  if (saga?.status === 'COMPLETED') {
    return (
      <>
        <PageHeader eyebrow={t.eyebrow} title={t.title} />
        <section className="platform-panel" role="status">
          <h2>{text.done}</h2>
          <p>{text.temporary}</p>
          <button type="button" className="platform-link" onClick={onBack}>
            {text.back}
          </button>
        </section>
      </>
    );
  }

  const stuck = saga?.status === 'RUNNING' && !sending;
  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} />
      <form className="platform-form" onSubmit={onSubmit} noValidate>
        <section>
          <p className="platform-eyebrow">{t.identityEyebrow}</p>
          <h2>{t.identityTitle}</h2>
          <p className="platform-section-copy">{t.identityCopy}</p>
          <div className="platform-form-grid">
            <Field id={ids.commercialName} label={t.commercialName} autoComplete="organization" value={values.commercialName} error={errors('commercialName')} onChange={set('commercialName')} />
            <Field id={ids.identifier} label={t.identifier} autoComplete="off" value={values.identifier} error={errors('identifier')} onChange={set('identifier')} />
            <SelectField id={ids.initialStatus} label={t.initialStatus} value={values.initialStatus} options={Object.entries(text.statuses)} onChange={(v) => setValues({ ...values, initialStatus: v as 'ACTIVE' | 'INACTIVE' })} />
            <SelectField id={ids.timeZone} label={t.timeZone} value={values.timeZone} options={timeZones.map((z): [string, string] => [z, z])} onChange={(v) => setValues({ ...values, timeZone: v })} />
            <SelectField id={ids.country} label={t.country} value={values.country} options={Object.entries(text.countries)} onChange={(v) => setValues({ ...values, country: v })} />
          </div>
        </section>
        <section>
          <p className="platform-eyebrow">{t.ownerEyebrow}</p>
          <h2>{t.ownerTitle}</h2>
          <p className="platform-section-copy">{t.ownerCopy}</p>
          <div className="platform-form-grid">
            <Field id={ids.fullName} label={t.fullName} autoComplete="off" value={values.fullName} error={errors('fullName')} onChange={set('fullName')} />
            <Field id={ids.email} label={t.email} type="email" autoComplete="off" value={values.email} error={errors('email')} onChange={set('email')} />
            <PasswordField id={ids.password} label={t.password} autoComplete="new-password" value={values.password} error={errors('password')} onChange={set('password')} />
            <PasswordField id={ids.passwordConfirmation} label={t.confirmPassword} autoComplete="new-password" value={values.passwordConfirmation} error={errors('passwordConfirmation')} onChange={set('passwordConfirmation')} />
          </div>
          <div className="platform-password-policy" aria-label={t.policyLabel} role="group">
            <p>{t.policyIntro}</p>
            <ul>
              {t.policy.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
        </section>
        <div aria-live="polite">
          {failure?.line && <p className="auth-feedback is-error">{failure.line}</p>}
          {saga && saga.status !== 'RUNNING' && (
            <p className="auth-feedback is-error">
              {text.failed} {saga.failedStep && text.steps[saga.failedStep]}
            </p>
          )}
          {stuck && <p>{text.running}</p>}
        </div>
        <div className="platform-form-actions">
          {stuck && (
            <button type="button" className="platform-link" onClick={refresh}>
              {text.refresh}
            </button>
          )}
          <button type="button" className="platform-link" onClick={onBack}>
            {t.cancel}
          </button>
          <button className="platform-primary" type="submit" disabled={sending}>
            {sending ? t.sending : t.submit}
          </button>
        </div>
      </form>
    </>
  );
}
