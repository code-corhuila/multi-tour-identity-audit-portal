// Texts of the zone and country screen, in Spanish like the other screens (portal spec 018, D-06).
export const localizationMessages = {
  openCash: 'No se puede cambiar la zona horaria mientras haya una caja abierta o pendiente de cierre. Ciérrala e inténtalo de nuevo.',
  cashUnreadable: 'No pudimos comprobar el estado de las cajas, así que no se cambió nada. Inténtalo de nuevo en unos minutos.',
  inactive: 'La empresa está inactiva: no se puede cambiar su zona horaria ni su país.',
  forbidden: 'No tienes permiso para cambiar la zona horaria ni el país.',
  zoneShape: 'Elige una zona horaria de la lista.',
  countryShape: 'Elige un país de la lista.',
} as const;
