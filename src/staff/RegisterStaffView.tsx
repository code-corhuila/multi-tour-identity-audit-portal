import { useState, type FormEvent } from 'react';
import { PageHeader } from '../platform/PageHeader';
import { Field } from '../ui/Field';
import { PasswordField } from '../ui/PasswordField';
import '../tenants/operator.css';

const t = {
  eyebrow: 'Gestión del equipo',
  title: 'Registrar colaborador',
  back: 'Volver a colaboradores',
  tenantLabel: 'Operador activo',
  tenantCopy: 'El colaborador queda asociado automáticamente a este operador; no es posible elegir otro tenant.',
  identityEyebrow: 'Datos del colaborador',
  identityTitle: 'Identidad y acceso',
  name: 'Nombre completo',
  namePlaceholder: 'Ej. Camila Restrepo',
  email: 'Correo electrónico / usuario de acceso',
  emailPlaceholder: 'camila@travesianatural.co',
  roleEyebrow: 'Rol',
  roleTitle: 'Rol asignado',
  role: 'Rol',
  roleValue: 'Colaborador operativo',
  roleCopy: 'El rol queda fijo en "Colaborador operativo"; no es posible asignar Administrador ni crear roles personalizados.',
  accessEyebrow: 'Credenciales',
  accessTitle: 'Acceso inicial',
  password: 'Contraseña inicial',
  confirmPassword: 'Confirmar contraseña',
  policyLabel: 'Requisitos de la contraseña',
  policyIntro: 'La contraseña debe contener:',
  policy: ['Mínimo 8 caracteres', 'Al menos una letra mayúscula', 'Al menos una letra minúscula', 'Al menos un número', 'Al menos un carácter especial'],
  hint: 'Completa los datos del colaborador para registrarlo.',
  required: 'Este campo es obligatorio.',
  mismatch: 'Las contraseñas no coinciden.',
  visualOnly: 'Esta vista es solo visual en esta versión: el colaborador no se registra.',
  cancel: 'Cancelar',
  submit: 'Registrar colaborador',
} as const;

type Values = { name: string; email: string; password: string; confirmPassword: string };
const empty: Values = { name: '', email: '', password: '', confirmPassword: '' };

export interface RegisterStaffViewProps {
  tenantName: string;
  onBack: () => void;
}

// Register view of the staff frame (Mockup admin-registrar-colaborador.html). It is visual only: the call of portal 004
// is not wired here, so a valid form says so and sends nothing. The role is the single contract value (RN-CAL-USR-05).
export function RegisterStaffView({ tenantName, onBack }: RegisterStaffViewProps) {
  const [values, setValues] = useState<Values>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [feedback, setFeedback] = useState<string>(t.hint);
  const set = (field: keyof Values) => (event: { target: { value: string } }) => setValues({ ...values, [field]: event.target.value });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Partial<Record<keyof Values, string>> = {};
    for (const field of ['name', 'email', 'password', 'confirmPassword'] as const) {
      if (!values[field].trim()) next[field] = t.required;
    }
    if (!next.confirmPassword && values.password !== values.confirmPassword) next.confirmPassword = t.mismatch;
    setErrors(next);
    setFeedback(Object.keys(next).length === 0 ? t.visualOnly : t.hint);
  }

  return (
    <>
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        action={
          <button type="button" className="operator-outline mt-page-header-action" onClick={onBack}>
            {t.back}
          </button>
        }
      />
      <section className="operator-panel">
        <p className="operator-eyebrow">{t.tenantLabel}</p>
        <h2>{tenantName}</h2>
        <p className="operator-copy">{t.tenantCopy}</p>
      </section>
      <form onSubmit={onSubmit} noValidate>
        <section className="operator-panel">
          <p className="operator-eyebrow">{t.identityEyebrow}</p>
          <h2>{t.identityTitle}</h2>
          <Field id="staff-name" label={t.name} placeholder={t.namePlaceholder} value={values.name} error={errors.name} onChange={set('name')} />
          <Field id="staff-email" label={t.email} type="email" placeholder={t.emailPlaceholder} value={values.email} error={errors.email} onChange={set('email')} />
        </section>
        <section className="operator-panel">
          <p className="operator-eyebrow">{t.roleEyebrow}</p>
          <h2>{t.roleTitle}</h2>
          <Field id="staff-role" label={t.role} readOnly value={t.roleValue} />
          <p className="operator-copy">{t.roleCopy}</p>
        </section>
        <section className="operator-panel">
          <p className="operator-eyebrow">{t.accessEyebrow}</p>
          <h2>{t.accessTitle}</h2>
          <PasswordField id="staff-password" label={t.password} autoComplete="new-password" value={values.password} error={errors.password} aria-describedby="staff-policy" onChange={set('password')} />
          <PasswordField id="staff-confirm" label={t.confirmPassword} autoComplete="new-password" value={values.confirmPassword} error={errors.confirmPassword} onChange={set('confirmPassword')} />
          <div id="staff-policy" role="group" aria-label={t.policyLabel}>
            <p>{t.policyIntro}</p>
            <ul>
              {t.policy.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
        </section>
        <p className="operator-copy" aria-live="polite">
          {feedback}
        </p>
        <div>
          <button type="button" className="operator-outline" onClick={onBack}>
            {t.cancel}
          </button>
          <button type="submit" className="operator-primary">
            {t.submit}
          </button>
        </div>
      </form>
    </>
  );
}
