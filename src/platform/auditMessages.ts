// Texts of the platform audit view, in Spanish as in the Mockup (admin-auditoria.html).
export const auditMessages = {
  eyebrow: 'Trazabilidad transversal',
  title: 'Auditoría de plataforma',
  introEyebrow: 'Eventos relevantes',
  introTitle: 'Las decisiones sobre operadores dejan evidencia.',
  introNote: 'Consulta altas, cambios de estado y acciones administrativas relevantes. Esta vista no expone datos operativos de los operadores.',
  columns: { occurredAt: 'Fecha y hora', action: 'Acción', operator: 'Operador', change: 'Cambio', actor: 'Responsable', reason: 'Motivo', detail: 'Detalle' },
  dialogEyebrow: 'Evento auditado',
  dialogTitle: 'Detalle de auditoría',
  close: 'Cerrar',
  closeLabel: 'Cerrar detalle',
  loading: 'Cargando…',
  error: 'No pudimos cargar la auditoría. Inténtalo de nuevo.',
  retry: 'Reintentar',
  empty: 'Aún no hay eventos de auditoría.',
  emptyFiltered: 'No hay eventos que coincidan con los filtros.',
  filters: {
    group: 'Filtros',
    action: 'Acción',
    operator: 'Operador',
    from: 'Desde',
    to: 'Hasta',
    allActions: 'Todas las acciones',
    allOperators: 'Todos los operadores',
    invalidPeriod: 'La fecha final no puede ser anterior a la inicial.',
  },
  detail: {
    affectedRecord: 'Registro afectado',
    previousValue: 'Valor anterior',
    newValue: 'Valor nuevo',
    channelOrModule: 'Canal o módulo',
    functionalReference: 'Referencia funcional',
  },
  // The record belongs to no tenant: an action on an account of the Platform Administrator.
  platform: 'Plataforma',
  none: '—',
  // Spec 014 section 4: a proposal of the screen until 02-domain closes the list of audited events (gap G-2).
  actions: {
    TENANT_CREATED: 'Operador creado',
    TENANT_INACTIVATED: 'Operador inactivado',
    TENANT_REACTIVATED: 'Operador reactivado',
    ACCOUNT_BLOCKED: 'Cuenta bloqueada',
    ACCOUNT_SESSIONS_REVOKED: 'Sesiones de una cuenta revocadas',
    SPECIAL_PERMISSION_GRANTED: 'Permiso especial otorgado',
    SPECIAL_PERMISSION_REVOKED: 'Permiso especial retirado',
    OPTIONAL_ROLE_ENABLED: 'Rol opcional habilitado',
    OPTIONAL_ROLE_DISABLED: 'Rol opcional deshabilitado',
    AUDIT_ACCESS_ENABLED: 'Acceso a la auditoría habilitado',
    AUDIT_ACCESS_DISABLED: 'Acceso a la auditoría retirado',
  } as Record<string, string>,
} as const;

// Spec 015 section 4: the group each action belongs to, in the words of the Mockup. A proposal of the screen until 02-domain
// closes the list of audited events (gap G-1).
const categories: Record<string, readonly string[]> = {
  Operadores: ['TENANT_CREATED', 'TENANT_INACTIVATED', 'TENANT_REACTIVATED'],
  'Credenciales y contraseñas': ['ACCOUNT_BLOCKED', 'ACCOUNT_SESSIONS_REVOKED'],
  'Permisos especiales': ['SPECIAL_PERMISSION_GRANTED', 'SPECIAL_PERMISSION_REVOKED'],
  'Usuarios internos': ['OPTIONAL_ROLE_ENABLED', 'OPTIONAL_ROLE_DISABLED', 'AUDIT_ACCESS_ENABLED', 'AUDIT_ACCESS_DISABLED'],
};

export const OTHER_CATEGORY = 'Otros';

// An action the table does not know is "Otros"; `includes` on an array cannot answer for a name of the prototype of an object.
export function categoryOf(action: string): string {
  return Object.entries(categories).find(([, actions]) => actions.includes(action))?.[0] ?? OTHER_CATEGORY;
}
