import { tenantMessages } from './messages';

const text = tenantMessages.register;

export type RegisterFormField = 'identifier' | 'commercialName' | 'fullName' | 'email' | 'password' | 'passwordConfirmation';
export type RegisterValues = Record<RegisterFormField, string>;

// Same pattern and length as `TenantIdentifier` of identity-audit.yaml.
const IDENTIFIER = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// The local rules of RN-IDA-PT-01 to -03, shared by the registration screen and the platform panel's create view.
export function validateRegister(values: RegisterValues): Partial<Record<RegisterFormField, string>> {
  const identifier = values.identifier.trim();
  return {
    identifier: !identifier ? text.identifierRequired : identifier.length < 3 || identifier.length > 40 || !IDENTIFIER.test(identifier) ? text.identifierShape : undefined,
    commercialName: values.commercialName.trim() ? undefined : text.nameRequired,
    fullName: values.fullName.trim() ? undefined : text.fullNameRequired,
    email: values.email.trim() ? undefined : text.emailRequired,
    password: values.password ? undefined : text.passwordRequired,
    passwordConfirmation: values.password && values.password !== values.passwordConfirmation ? text.mismatch : undefined,
  };
}
