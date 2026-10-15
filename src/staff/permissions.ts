// Special permissions of the tenant and who can hold them (Mockup OPERATOR_ROLES, PDR section 9).
export const PERMISSIONS = ['Validar comprobantes', 'Gestionar caja', 'Gestionar ejecución de salidas', 'Consultar datos sensibles'] as const;
export type Permission = (typeof PERMISSIONS)[number];

interface RolePolicy {
  byProfile: readonly Permission[];
  assignable: readonly Permission[];
  queryOnly: boolean;
}

const POLICIES: Record<string, RolePolicy> = {
  'Administrador del tenant': { byProfile: PERMISSIONS.slice(0, 3), assignable: ['Consultar datos sensibles'], queryOnly: false },
  'Colaborador operativo': { byProfile: [], assignable: PERMISSIONS, queryOnly: false },
  Gerente: { byProfile: [], assignable: [], queryOnly: true },
  Contador: { byProfile: [], assignable: [], queryOnly: true },
  Analista: { byProfile: [], assignable: [], queryOnly: true },
};

const NONE: RolePolicy = { byProfile: [], assignable: [], queryOnly: false };
export const policyOf = (role: string): RolePolicy => POLICIES[role] ?? NONE;

export type PermissionState = 'profile' | 'granted' | 'free' | 'not-applicable';

export function stateOf(role: string, permission: Permission, granted: ReadonlySet<Permission>): PermissionState {
  const policy = policyOf(role);
  if (policy.byProfile.includes(permission)) return 'profile';
  if (!policy.assignable.includes(permission)) return 'not-applicable';
  return granted.has(permission) ? 'granted' : 'free';
}
