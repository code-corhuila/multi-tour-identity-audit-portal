// The person's local day in Spanish, as the Mockup writes it ("martes, 13 de octubre de 2026").
export const formatToday = (date: Date = new Date()): string =>
  date.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
