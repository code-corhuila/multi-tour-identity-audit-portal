// Texts of the visual identity screen, in Spanish like the other screens (portal spec 005, D-07).
export const visualIdentityMessages = {
  card: 'Identidad visual',
  cardBody: 'Elige los colores de tu empresa en el canal digital.',
  eyebrow: 'Configuración de la empresa',
  title: 'Identidad visual',
  company: 'Empresa',
  back: 'Volver al panel',
  loading: 'Cargando…',
  primary: 'Color principal',
  secondary: 'Color secundario',
  pickerOf: (label: string) => `Selector de ${label.toLowerCase()}`,
  colorShape: 'Escribe el color como #RRGGBB.',
  defaultsNote: 'Tu empresa usa la identidad por defecto de Multitour.',
  preview: 'Vista previa',
  previewHeading: 'Así se verá tu empresa',
  previewPrimary: 'Botón principal',
  previewOutline: 'Botón secundario',
  submit: 'Guardar identidad visual',
  sending: 'Guardando…',
  saved: 'Identidad visual guardada. Tus clientes verán estos colores.',
  retry: 'Reintentar',
  forbidden: 'No tienes permiso para cambiar la identidad visual.',
  inactive: 'La empresa está inactiva: no se puede cambiar su identidad visual.',
} as const;

// Defaults of the operator theme (--accent and --accent-strong) while the company has set none.
export const DEFAULT_COLORS = { primaryColor: '#2f6b57', secondaryColor: '#1f4d3d' } as const;
