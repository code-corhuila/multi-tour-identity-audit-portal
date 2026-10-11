// Texts of the platform screens, in Spanish as in the Mockup `admin-operadores.html` (portal spec 002, gap G-1).
export const tenantMessages = {
  eyebrow: 'Gestión de operadores',
  title: 'Operadores',
  panelEyebrow: 'Directorio',
  panelTitle: 'Empresas operadoras',
  columns: { name: 'Operador', identifier: 'Identificador', status: 'Estado', since: 'Desde (UTC)' },
  statusFilter: 'Estado',
  allStatuses: 'Todos',
  statuses: { PENDING: 'Pendiente', ACTIVE: 'Activo', INACTIVE: 'Inactivo', FAILED: 'Fallido' },
  loading: 'Cargando…',
  retry: 'Reintentar',
  empty: 'Aún no hay operadores registrados.',
  previous: 'Anterior',
  next: 'Siguiente',
  pagination: 'Paginación',
  pageOf: (page: number, total: number) => `Página ${page} de ${total}`,
} as const;
