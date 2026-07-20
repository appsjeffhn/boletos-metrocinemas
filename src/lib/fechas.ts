/** Fecha calendario (YYYY-MM-DD) de una fecha dada, en la zona horaria indicada. */
export function fechaISOEn(fecha: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(fecha);
}

/** Fecha calendario de "hoy" (YYYY-MM-DD) en la zona horaria indicada. */
export function hoyISOEn(tz: string): string {
  return fechaISOEn(new Date(), tz);
}

/**
 * Fecha y hora (dd/mm/aaaa hh:mm a. m./p. m.) de una fecha dada, en la zona
 * horaria indicada. Siempre pasar `tz` explícito: sin `timeZone` el formateo
 * usa la zona del proceso (UTC en el servidor de Vercel), no la configurada.
 */
export function fechaHoraEn(fecha: Date, tz: string): string {
  return new Intl.DateTimeFormat("es-HN", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(fecha);
}
