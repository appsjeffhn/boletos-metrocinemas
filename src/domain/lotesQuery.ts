import { eq, desc, sql } from "drizzle-orm";
import type { DrizzleDb } from "@/db/client";
import { lotes, empresas, loteSedes, sedes, boletos } from "@/db/schema";

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
  /** IDs de las sedes asignadas al lote (vacío = válido en todas). */
  sedeIds: number[];
  /** true si el lote tiene al menos un boleto canjeado (bloquea editar/eliminar). */
  tieneCanjes: boolean;
  /** cantidad de boletos canjeados del lote (para la barra de progreso). */
  canjeados: number;
};

export async function listarLotes(db: DrizzleDb): Promise<LoteListado[]> {
  const filas = await db
    .select({
      id: lotes.id, empresa: empresas.nombre, descripcion: lotes.descripcion,
      cantidad: lotes.cantidad, fechaVencimiento: lotes.fechaVencimiento, creadoEn: lotes.creadoEn,
      anuladoEn: lotes.anuladoEn, anuladoMotivo: lotes.anuladoMotivo,
      sede: sedes.nombre, sedeId: sedes.id,
    })
    .from(lotes)
    .innerJoin(empresas, eq(lotes.empresaId, empresas.id))
    .leftJoin(loteSedes, eq(loteSedes.loteId, lotes.id))
    .leftJoin(sedes, eq(sedes.id, loteSedes.sedeId))
    .orderBy(desc(lotes.creadoEn));

  // Consulta separada (no unida a la de arriba) para no multiplicar filas por
  // el join de sedes: solo nos interesa qué lotes tienen ≥1 boleto canjeado.
  const canjesPorLote = await db
    .select({ loteId: boletos.loteId, canjeados: sql<number>`count(*)::int` })
    .from(boletos)
    .where(eq(boletos.estado, "canjeado"))
    .groupBy(boletos.loteId);
  const lotesConCanjes = new Set(canjesPorLote.map((c) => c.loteId));
  const canjeadosPorLote = new Map(canjesPorLote.map((c) => [c.loteId, c.canjeados]));

  const porLote = new Map<number, LoteListado>();
  for (const fila of filas) {
    let l = porLote.get(fila.id);
    if (!l) {
      l = {
        id: fila.id, empresa: fila.empresa, descripcion: fila.descripcion,
        cantidad: fila.cantidad, fechaVencimiento: fila.fechaVencimiento, creadoEn: fila.creadoEn,
        anulado: fila.anuladoEn !== null, anuladoMotivo: fila.anuladoMotivo, sedes: [], sedeIds: [],
        tieneCanjes: lotesConCanjes.has(fila.id),
        canjeados: canjeadosPorLote.get(fila.id) ?? 0,
      };
      porLote.set(fila.id, l);
    }
    if (fila.sede) l.sedes.push(fila.sede);
    if (fila.sedeId) l.sedeIds.push(fila.sedeId);
  }
  return Array.from(porLote.values());
}
