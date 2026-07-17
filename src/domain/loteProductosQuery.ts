import { asc, eq } from "drizzle-orm";
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
