// Texts of the staff home, in Spanish as in the Mockup (admin-operador.html).
export const homeMessages = {
  eyebrow: 'Multitour',
  title: 'Control de la operación',
  tenant: 'Operador',
  profile: 'Mi perfil',
  heroEyebrow: 'Vista diaria',
  heroTitle: 'Decisiones comerciales y operativas en un solo lugar.',
  heroCopy: 'Gestiona únicamente la información de tu operador: reservas, catálogo, descuentos, pagos, caja y ejecución.',
  testData: 'Datos de prueba',
  empty: 'Los indicadores llegan con las áreas comercial y de caja.',
  soon: 'Próximamente',
  none: '—',
  daily: {
    title: 'Resumen diario',
    eyebrow: 'Seguimiento de reservas y ejecución',
    copy: 'Indicadores obligatorios para priorizar la operación del día.',
    metrics: ['Reservas creadas hoy', 'Reservas pendientes de pago', 'Reservas confirmadas', 'Reservas canceladas', 'Tours o servicios próximos a ejecutar'],
  },
  pending: { title: 'Pendientes operativos', eyebrow: 'Validaciones y control de caja', metrics: ['Pagos y soportes por validar', 'Total operativo de caja'] },
  manage: {
    title: '¿Qué necesitas gestionar?',
    cards: {
      reservations: { title: 'Reservas y clientes', body: 'Reservas, clientes y su seguimiento.' },
      discounts: { title: 'Descuentos y condiciones', body: 'Reglas de descuento vigentes.' },
      payments: { title: 'Pagos y devoluciones', body: 'Pagos recibidos, soportes y devoluciones.' },
      operations: { title: 'Ejecución y costos', body: 'Ejecución de servicios y sus costos.' },
    },
  },
} as const;
