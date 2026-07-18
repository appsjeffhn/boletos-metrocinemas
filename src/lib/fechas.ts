/** Fecha calendario (YYYY-MM-DD) de una fecha dada, en la zona horaria indicada. */
export function fechaISOEn(fecha: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(fecha);
}

/** Fecha calendario de "hoy" (YYYY-MM-DD) en la zona horaria indicada. */
export function hoyISOEn(tz: string): string {
  return fechaISOEn(new Date(), tz);
}
