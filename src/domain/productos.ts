import { eq } from "drizzle-orm";
import type { DrizzleDb } from "@/db/client";
import { productos } from "@/db/schema";
import { esViolacionUnica } from "@/lib/dbErrors";

function parsearPrecio(precio?: string | null): { precio: string | null } | { error: string } {
  if (precio == null) return { precio: null };
  const s = String(precio).trim();
  if (s === "") return { precio: null };
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return { error: "El precio no es válido." };
  if (n > 99999999.99) return { error: "El precio es demasiado alto." };
  return { precio: n.toFixed(2) };
}

export async function crearProducto(
  db: DrizzleDb,
  input: { nombre: string; detalle?: string | null; precio?: string | null },
): Promise<{ id: number } | { error: string }> {
  const nombre = input.nombre.trim();
  if (!nombre) return { error: "El nombre es obligatorio." };
  const detalle = input.detalle?.trim() || null;
  const pr = parsearPrecio(input.precio);
  if ("error" in pr) return { error: pr.error };
  try {
    const [row] = await db.insert(productos)
      .values({ nombre, detalle, precio: pr.precio })
      .returning({ id: productos.id });
    return { id: row.id };
  } catch (err) {
    if (esViolacionUnica(err)) return { error: "Ya existe un producto con ese nombre." };
    throw err;
  }
}

export async function editarProducto(
  db: DrizzleDb,
  id: number,
  input: { nombre: string; detalle?: string | null; precio?: string | null; activo?: boolean },
): Promise<{ ok: true } | { error: string }> {
  const nombre = input.nombre.trim();
  if (!nombre) return { error: "El nombre es obligatorio." };
  const detalle = input.detalle?.trim() || null;
  const pr = parsearPrecio(input.precio);
  if ("error" in pr) return { error: pr.error };
  try {
    await db.update(productos)
      .set({ nombre, detalle, precio: pr.precio, ...(input.activo === undefined ? {} : { activo: input.activo }) })
      .where(eq(productos.id, id));
    return { ok: true };
  } catch (err) {
    if (esViolacionUnica(err)) return { error: "Ya existe un producto con ese nombre." };
    throw err;
  }
}

export async function desactivarProducto(db: DrizzleDb, id: number): Promise<{ ok: true }> {
  await db.update(productos).set({ activo: false }).where(eq(productos.id, id));
  return { ok: true };
}
