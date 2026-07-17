import { eq, desc } from "drizzle-orm";
import type { DrizzleDb } from "@/db/client";
import { lotes, empresas } from "@/db/schema";

export function listarLotes(db: DrizzleDb) {
  return db
    .select({
      id: lotes.id, empresa: empresas.nombre, descripcion: lotes.descripcion,
      cantidad: lotes.cantidad, fechaVencimiento: lotes.fechaVencimiento, creadoEn: lotes.creadoEn,
    })
    .from(lotes)
    .innerJoin(empresas, eq(lotes.empresaId, empresas.id))
    .orderBy(desc(lotes.creadoEn));
}
