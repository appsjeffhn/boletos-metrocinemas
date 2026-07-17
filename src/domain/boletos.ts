import { eq } from "drizzle-orm";
import type { DrizzleDb } from "@/db/client";
import { lotes, boletos, empresas } from "@/db/schema";
import { generarCodigo, generarToken } from "@/lib/codigo";

export type NuevoLote = {
  empresaId: number;
  descripcion: string;
  cantidad: number;
  fechaVencimiento: string; // ISO date YYYY-MM-DD
  creadoPor?: number;
};

export async function generarLote(db: DrizzleDb, input: NuevoLote) {
  const [emp] = await db.select({ prefijo: empresas.prefijo })
    .from(empresas).where(eq(empresas.id, input.empresaId));
  if (!emp) throw new Error("Empresa no encontrada");

  const [lote] = await db.insert(lotes).values({
    empresaId: input.empresaId,
    descripcion: input.descripcion,
    cantidad: input.cantidad,
    fechaVencimiento: input.fechaVencimiento,
    creadoPor: input.creadoPor ?? null,
  }).returning();

  const filas = Array.from({ length: input.cantidad }, () => ({
    loteId: lote.id,
    codigo: generarCodigo(emp.prefijo),
    token: generarToken(),
  }));

  const insertados = await db.insert(boletos).values(filas)
    .returning({ id: boletos.id, codigo: boletos.codigo, token: boletos.token });

  return { loteId: lote.id, boletos: insertados };
}
