import { and, eq, isNull } from "drizzle-orm";
import type { DrizzleDb } from "@/db/client";
import { boletos, empresas, lotes } from "@/db/schema";

export function listarEmpresas(db: DrizzleDb) {
  return db.select().from(empresas).orderBy(empresas.nombre);
}

/**
 * true si la empresa tiene al menos un lote no anulado con ≥1 boleto en
 * estado 'activo'. Se usa para bloquear el borrado de la empresa.
 */
export async function empresaTieneLotesActivos(db: DrizzleDb, empresaId: number): Promise<boolean> {
  const filas = await db
    .select({ id: lotes.id })
    .from(lotes)
    .innerJoin(boletos, and(eq(boletos.loteId, lotes.id), eq(boletos.estado, "activo")))
    .where(and(eq(lotes.empresaId, empresaId), isNull(lotes.anuladoEn)))
    .limit(1);
  return filas.length > 0;
}
