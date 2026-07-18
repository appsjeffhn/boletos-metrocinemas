import { eq } from "drizzle-orm";
import type { DrizzleDb } from "@/db/client";
import { configuracion } from "@/db/schema";
import { ZONA_DEFAULT, esZonaValida } from "@/lib/zonasHorarias";

export async function zonaHoraria(db: DrizzleDb): Promise<string> {
  const [row] = await db
    .select({ zonaHoraria: configuracion.zonaHoraria })
    .from(configuracion)
    .where(eq(configuracion.id, 1));
  return row?.zonaHoraria ?? ZONA_DEFAULT;
}

export async function guardarZonaHoraria(
  db: DrizzleDb,
  tz: string,
): Promise<{ ok: true } | { error: string }> {
  if (!esZonaValida(tz)) return { error: "Zona horaria no válida." };
  await db
    .insert(configuracion)
    .values({ id: 1, zonaHoraria: tz })
    .onConflictDoUpdate({ target: configuracion.id, set: { zonaHoraria: tz, actualizadoEn: new Date() } });
  return { ok: true };
}
