export const ZONA_DEFAULT = "America/Tegucigalpa";

export const ZONAS_HORARIAS: { id: string; label: string }[] = [
  { id: "America/Tegucigalpa", label: "Tegucigalpa (UTC-6)" },
  { id: "America/Guatemala", label: "Guatemala (UTC-6)" },
  { id: "America/El_Salvador", label: "El Salvador (UTC-6)" },
  { id: "America/Managua", label: "Managua (UTC-6)" },
  { id: "America/Costa_Rica", label: "Costa Rica (UTC-6)" },
  { id: "America/Mexico_City", label: "Ciudad de México (UTC-6)" },
  { id: "America/Panama", label: "Panamá (UTC-5)" },
  { id: "America/Bogota", label: "Bogotá (UTC-5)" },
  { id: "America/New_York", label: "Nueva York (UTC-5/-4)" },
  { id: "America/Los_Angeles", label: "Los Ángeles (UTC-8/-7)" },
  { id: "UTC", label: "UTC" },
];

const IDS = new Set(ZONAS_HORARIAS.map((z) => z.id));

export function esZonaValida(tz: string): boolean {
  return IDS.has(tz);
}
