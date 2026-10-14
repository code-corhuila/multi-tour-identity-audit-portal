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
  testData: 'Datos de prueba',
} as const;
