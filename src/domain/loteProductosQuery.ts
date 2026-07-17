import { asc, eq, inArray } from "drizzle-orm";
import type { DrizzleDb } from "@/db/client";
import { boletos, loteProductos } from "@/db/schema";

export type ProductoDeLote = {
  id: number;
  productoId: number | null;
  nombre: string;
  detalle: string | null;
  precioUnitario: string | null;
  cantidadPorBoleto: number;
};

export async function productosDeLote(db: DrizzleDb, loteId: number): Promise<ProductoDeLote[]> {
  return db
    .select({
      id: loteProductos.id, productoId: loteProductos.productoId, nombre: loteProductos.nombre,
      detalle: loteProductos.detalle, precioUnitario: loteProductos.precioUnitario,
      cantidadPorBoleto: loteProductos.cantidadPorBoleto,
    })
    .from(loteProductos)
    .where(eq(loteProductos.loteId, loteId))
    .orderBy(asc(loteProductos.orden), asc(loteProductos.id));
}

export async function productosDeLotes(
  db: DrizzleDb,
  loteIds: number[],
): Promise<Record<number, ProductoDeLote[]>> {
  const out: Record<number, ProductoDeLote[]> = {};
  for (const id of loteIds) out[id] = [];
  if (loteIds.length === 0) return out;

  const filas = await db
    .select({
      loteId: loteProductos.loteId,
      id: loteProductos.id, productoId: loteProductos.productoId, nombre: loteProductos.nombre,
      detalle: loteProductos.detalle, precioUnitario: loteProductos.precioUnitario,
      cantidadPorBoleto: loteProductos.cantidadPorBoleto,
    })
    .from(loteProductos)
    .where(inArray(loteProductos.loteId, loteIds))
    .orderBy(asc(loteProductos.orden), asc(loteProductos.id));

  for (const f of filas) {
    (out[f.loteId] ??= []).push({
      id: f.id, productoId: f.productoId, nombre: f.nombre,
      detalle: f.detalle, precioUnitario: f.precioUnitario, cantidadPorBoleto: f.cantidadPorBoleto,
    });
  }
  return out;
}

export async function productosPorToken(
  db: DrizzleDb, token: string,
): Promise<{ nombre: string; detalle: string | null; cantidadPorBoleto: number }[]> {
  return db
    .select({
      nombre: loteProductos.nombre, detalle: loteProductos.detalle,
      cantidadPorBoleto: loteProductos.cantidadPorBoleto,
    })
    .from(loteProductos)
    .innerJoin(boletos, eq(boletos.loteId, loteProductos.loteId))
    .where(eq(boletos.token, token))
    .orderBy(asc(loteProductos.orden), asc(loteProductos.id));
}
