// Texts of the signed-in shells, in Spanish as in the Mockup (admin-operador.html, panel-cliente.html).
export const shellMessages = {
  signOut: 'Cerrar sesión',
  soon: 'Próximamente',
  staff: {
    role: 'Equipo del operador',
    eyebrow: 'Multitour',
    title: 'Control de la operación',
    tenant: 'Operador',
    intro: 'Gestiona únicamente la información de tu operador.',
    cards: {
      cash: { title: 'Caja', body: 'Movimientos y cierres de caja.' },
      catalogs: { title: 'Catálogos', body: 'Tours, servicios y su disponibilidad.' },
      collaborators: { title: 'Colaboradores', body: 'Personas del equipo del operador.' },
      discounts: { title: 'Descuentos', body: 'Reglas de descuento vigentes.' },
      operations: { title: 'Operación', body: 'Ejecución y seguimiento de servicios.' },
      payments: { title: 'Pagos', body: 'Pagos recibidos y por validar.' },
    },
  },
  customer: {
    role: 'Portal cliente',
    eyebrow: 'Portal cliente',
    greeting: 'Hola',
    body: 'Consulta tus reservas y continúa la gestión de tus próximos viajes desde un solo lugar.',
    reservations: { title: 'Mis reservas', body: 'Revisa y crea tus reservas.' },
    profile: { title: 'Mi perfil', body: 'Tus datos de contacto.' },
  },
} as const;
