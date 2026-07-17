import { eq, desc } from "drizzle-orm";
import type { DrizzleDb } from "@/db/client";
import { lotes, empresas, loteSedes, sedes } from "@/db/schema";

export type LoteListado = {
  id: number;
  empresa: string;
  descripcion: string;
  cantidad: number;
  fechaVencimiento: string;
  creadoEn: Date;
  anulado: boolean;
  anuladoMotivo: string | null;
  sedes: string[];
};

export async function listarLotes(db: DrizzleDb): Promise<LoteListado[]> {
  const filas = await db
    .select({
      id: lotes.id, empresa: empresas.nombre, descripcion: lotes.descripcion,
      cantidad: lotes.cantidad, fechaVencimiento: lotes.fechaVencimiento, creadoEn: lotes.creadoEn,
      anuladoEn: lotes.anuladoEn, anuladoMotivo: lotes.anuladoMotivo,
      sede: sedes.nombre,
    })
    .from(lotes)
    .innerJoin(empresas, eq(lotes.empresaId, empresas.id))
    .leftJoin(loteSedes, eq(loteSedes.loteId, lotes.id))
    .leftJoin(sedes, eq(sedes.id, loteSedes.sedeId))
    .orderBy(desc(lotes.creadoEn));

  const porLote = new Map<number, LoteListado>();
  for (const fila of filas) {
    let l = porLote.get(fila.id);
    if (!l) {
      l = {
        id: fila.id, empresa: fila.empresa, descripcion: fila.descripcion,
        cantidad: fila.cantidad, fechaVencimiento: fila.fechaVencimiento, creadoEn: fila.creadoEn,
        anulado: fila.anuladoEn !== null, anuladoMotivo: fila.anuladoMotivo, sedes: [],
      };
      porLote.set(fila.id, l);
    }
    if (fila.sede) l.sedes.push(fila.sede);
  }
  return Array.from(porLote.values());
}
