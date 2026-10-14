// Texts of the "Mi perfil" view, in Spanish as in the Mockup (profile.html).
export const profileMessages = {
  title: 'Mi perfil',
  intro: 'Consulta y actualiza tu información personal dentro del operador actual.',
  identity: 'Identidad',
  notRegistered: 'No registrado',
  account: { title: 'Datos de la cuenta', name: 'Nombre completo', email: 'Correo electrónico', role: 'Rol' },
  personal: { title: 'Datos personales', phone: 'Número de teléfono' },
  security: { title: 'Seguridad', edit: 'Editar perfil', changePassword: 'Cambiar contraseña', back: 'Volver al panel' },
  editNote: 'La edición del perfil aún no está disponible.',
  signOut: 'Cerrar sesión',
  error: { message: 'No pudimos leer tu sesión.', action: 'Volver al inicio de sesión' },
  roles: {
    PLATFORM_ADMINISTRATOR: 'Administrador de plataforma',
    TENANT_ADMINISTRATOR: 'Administrador del operador',
    OPERATIONAL_COLLABORATOR: 'Colaborador operativo',
    MANAGER: 'Gerente',
    ACCOUNTANT: 'Contador',
    ANALYST: 'Analista',
    FINAL_CUSTOMER: 'Cliente final',
  } as Record<string, string>,
} as const;
