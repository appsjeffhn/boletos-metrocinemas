import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { DrizzleDb } from "@/db/client";
import { boletos, lotes, empresas, sedes, loteProductos, usuarios } from "@/db/schema";

export type ResumenProducto = {
  productoId: number | null;
  nombre: string;
  creados: number;
  canjeados: number;
  pendientes: number;
  montoCreado: number;
  montoCanjeado: number;
  montoPendiente: number;
};

export async function resumenProductos(
  db: DrizzleDb,
  filtro: { empresaId?: number },
): Promise<ResumenProducto[]> {
  const grupo = sql<string>`coalesce(${loteProductos.productoId}::text, lower(trim(${loteProductos.nombre})))`;
  const cond = filtro.empresaId ? [eq(lotes.empresaId, filtro.empresaId)] : [];

  const rows = await db
    .select({
      productoId: loteProductos.productoId,
      nombre: sql<string>`min(${loteProductos.nombre})`,
      creados: sql<number>`sum(case when ${boletos.estado} != 'anulado' then ${loteProductos.cantidadPorBoleto} else 0 end)::int`,
      canjeados: sql<number>`sum(case when ${boletos.estado} = 'canjeado' then ${loteProductos.cantidadPorBoleto} else 0 end)::int`,
      montoCreado: sql<number>`coalesce(sum(case when ${boletos.estado} != 'anulado' then ${loteProductos.cantidadPorBoleto} * coalesce(${loteProductos.precioUnitario},0) else 0 end),0)::float8`,
      montoCanjeado: sql<number>`coalesce(sum(case when ${boletos.estado} = 'canjeado' then ${loteProductos.cantidadPorBoleto} * coalesce(${loteProductos.precioUnitario},0) else 0 end),0)::float8`,
    })
    .from(loteProductos)
    .innerJoin(lotes, eq(loteProductos.loteId, lotes.id))
    .innerJoin(boletos, eq(boletos.loteId, loteProductos.loteId))
    .where(cond.length ? and(...cond) : undefined)
    .groupBy(grupo, loteProductos.productoId)
    .orderBy(sql`min(${loteProductos.nombre})`);

  return rows.map((r) => ({
    productoId: r.productoId,
    nombre: r.nombre,
    creados: r.creados,
    canjeados: r.canjeados,
    pendientes: r.creados - r.canjeados,
    montoCreado: r.montoCreado,
    montoCanjeado: r.montoCanjeado,
    montoPendiente: r.montoCreado - r.montoCanjeado,
  }));
}

export type FiltroCanjesProductos = { desde?: string; hasta?: string; sedeId?: number; empresaId?: number };

export type CanjeProductoRow = {
  producto: string;
  fecha: Date | null;
  sede: string | null;
  empresa: string;
  loteId: number;
  codigo: string;
  cantidad: number;
  precioUnitario: number | null;
  importe: number | null;
  operador: string | null;
};

const operadores = alias(usuarios, "operadores_rp");

export async function detalleCanjesProductos(
  db: DrizzleDb,
  filtro: FiltroCanjesProductos,
): Promise<CanjeProductoRow[]> {
  const cond = [eq(boletos.estado, "canjeado")];
  if (filtro.empresaId) cond.push(eq(lotes.empresaId, filtro.empresaId));
  if (filtro.sedeId) cond.push(eq(boletos.canjeSedeId, filtro.sedeId));
  if (filtro.desde) cond.push(gte(boletos.canjeFecha, new Date(filtro.desde)));
  if (filtro.hasta) cond.push(lte(boletos.canjeFecha, new Date(filtro.hasta + "T23:59:59")));

  return db
    .select({
      producto: loteProductos.nombre,
      fecha: boletos.canjeFecha,
      sede: sedes.nombre,
      empresa: empresas.nombre,
      loteId: boletos.loteId,
      codigo: boletos.codigo,
      cantidad: loteProductos.cantidadPorBoleto,
      precioUnitario: sql<number | null>`${loteProductos.precioUnitario}::float8`,
      importe: sql<number | null>`(${loteProductos.cantidadPorBoleto} * ${loteProductos.precioUnitario})::float8`,
      operador: operadores.usuario,
    })
    .from(boletos)
    .innerJoin(loteProductos, eq(loteProductos.loteId, boletos.loteId))
    .innerJoin(lotes, eq(boletos.loteId, lotes.id))
    .innerJoin(empresas, eq(lotes.empresaId, empresas.id))
    .leftJoin(sedes, eq(boletos.canjeSedeId, sedes.id))
    .leftJoin(operadores, eq(boletos.canjeUsuarioId, operadores.id))
    .where(and(...cond))
    .orderBy(asc(boletos.canjeFecha));
}
