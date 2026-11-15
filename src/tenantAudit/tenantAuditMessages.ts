// Texts of the audit of the tenant, in Spanish as in the Mockup (admin-auditoria-tenant.html). The names of the actions, the
// columns and the states are those of the platform screen (auditMessages.ts).
export const tenantAuditMessages = {
  eyebrow: 'Solo consulta',
  title: 'Auditoría del tenant',
  introEyebrow: 'Eventos relevantes',
  introTitle: 'Trazabilidad de cambios del tenant',
  noteAdministrator: 'Eventos administrativos del tenant. Tú decides qué roles de consulta acceden a esta vista en Colaboradores.',
  noteReader: 'Eventos relevantes del tenant. Acceso de solo consulta habilitado por el Administrador del tenant.',
  metadataOnly: 'Solo metadatos administrativos: nunca datos operativos ni sensibles de los clientes.',
  refused: 'Tu rol no tiene acceso a la auditoría del tenant. Pide al Administrador del tenant que lo habilite en Colaboradores.',
} as const;
