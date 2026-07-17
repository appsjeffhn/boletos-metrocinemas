import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { DrizzleDb } from "@/db/client";
import { boletos, lotes, empresas, sedes } from "@/db/schema";

export type ReporteEmpresa = {
  empresaId: number; empresa: string;
  emitidos: number; canjeados: number; pendientes: number; anulados: number;
};

export async function reportePorEmpresa(db: DrizzleDb): Promise<ReporteEmpresa[]> {
  const rows = await db
    .select({
      empresaId: empresas.id, empresa: empresas.nombre,
      emitidos: sql<number>`count(${boletos.id})::int`,
      canjeados: sql<number>`count(*) filter (where ${boletos.estado} = 'canjeado')::int`,
      pendientes: sql<number>`count(*) filter (where ${boletos.estado} = 'activo')::int`,
      anulados: sql<number>`count(*) filter (where ${boletos.estado} = 'anulado')::int`,
    })
    .from(empresas)
    .leftJoin(lotes, eq(lotes.empresaId, empresas.id))
    .leftJoin(boletos, eq(boletos.loteId, lotes.id))
    .groupBy(empresas.id, empresas.nombre)
    .orderBy(empresas.nombre);
  return rows;
}

export type FiltroCanjes = { desde?: string; hasta?: string; sedeId?: number; empresaId?: number };

export async function listarCanjes(db: DrizzleDb, filtro: FiltroCanjes) {
  const cond = [eq(boletos.estado, "canjeado")];
  if (filtro.empresaId) cond.push(eq(lotes.empresaId, filtro.empresaId));
  if (filtro.sedeId) cond.push(eq(boletos.canjeSedeId, filtro.sedeId));
  if (filtro.desde) cond.push(gte(boletos.canjeFecha, new Date(filtro.desde)));
  if (filtro.hasta) cond.push(lte(boletos.canjeFecha, new Date(filtro.hasta + "T23:59:59")));

  return db
    .select({
      codigo: boletos.codigo, empresa: empresas.nombre, sede: sedes.nombre,
      portadorNombre: boletos.canjePortadorNombre, portadorDni: boletos.canjePortadorDni,
      fecha: boletos.canjeFecha,
    })
    .from(boletos)
    .innerJoin(lotes, eq(boletos.loteId, lotes.id))
    .innerJoin(empresas, eq(lotes.empresaId, empresas.id))
    .leftJoin(sedes, eq(boletos.canjeSedeId, sedes.id))
    .where(and(...cond))
    .orderBy(boletos.canjeFecha);
}
