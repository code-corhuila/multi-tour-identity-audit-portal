// Interface texts, in Spanish as in the Mockup (spec gap G-1). Code, tests and comments stay in English.
export const messages = {
  brand: 'Multitour',
  signIn: {
    title: 'Bienvenido de nuevo',
    subtitle: 'Ingresa a tu cuenta para gestionar tus viajes.',
    submit: 'Iniciar sesión',
    noAccount: '¿No tienes una cuenta?',
    createAccount: 'Crear cuenta',
  },
  platform: {
    kicker: 'Multi tour / entorno interno',
    title: 'Acceso de plataforma',
    subtitle: 'Ingresa para administrar los operadores de Multi tour.',
    submit: 'Ingresar a plataforma',
    back: 'Volver al acceso general',
  },
  notFound: {
    title: 'Página no encontrada',
    subtitle: 'El enlace que abriste no existe o ya no está disponible.',
  },
  fields: {
    email: 'Correo electrónico',
    emailPlaceholder: 'correo@ejemplo.com',
    password: 'Contraseña',
    show: 'Ver',
    hide: 'Ocultar',
  },
  errors: {
    emailRequired: 'Ingresa tu correo electrónico.',
    passwordRequired: 'Ingresa tu contraseña.',
    refused: 'Correo o contraseña incorrectos',
    unavailable: 'No pudimos completar la solicitud. Intenta de nuevo.',
    trace: 'Código de seguimiento',
  },
  sending: 'Ingresando…',
} as const;
