import { asc, eq } from "drizzle-orm";
import type { DrizzleDb } from "@/db/client";
import { productos } from "@/db/schema";

export type ProductoCatalogo = {
  id: number; nombre: string; detalle: string | null; precio: string | null; activo: boolean;
};

export async function listarProductos(db: DrizzleDb): Promise<ProductoCatalogo[]> {
  return db
    .select({
      id: productos.id, nombre: productos.nombre, detalle: productos.detalle,
      precio: productos.precio, activo: productos.activo,
    })
    .from(productos)
    .orderBy(asc(productos.nombre));
}

export async function nombresProductos(db: DrizzleDb): Promise<string[]> {
  const filas = await db
    .select({ nombre: productos.nombre })
    .from(productos)
    .where(eq(productos.activo, true))
    .orderBy(asc(productos.nombre));
  return filas.map((f) => f.nombre);
}
