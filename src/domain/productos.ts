import { eq } from "drizzle-orm";
import type { DrizzleDb } from "@/db/client";
import { productos } from "@/db/schema";

function normalizarPrecio(precio?: string | null): string | null {
  if (precio == null) return null;
  const s = String(precio).trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n.toFixed(2);
}

export async function crearProducto(
  db: DrizzleDb,
  input: { nombre: string; detalle?: string | null; precio?: string | null },
): Promise<{ id: number } | { error: string }> {
  const nombre = input.nombre.trim();
  if (!nombre) return { error: "El nombre es obligatorio." };
  const detalle = input.detalle?.trim() || null;
  const precio = normalizarPrecio(input.precio);
  try {
    const [row] = await db.insert(productos)
      .values({ nombre, detalle, precio })
      .returning({ id: productos.id });
    return { id: row.id };
  } catch {
    return { error: "Ya existe un producto con ese nombre." };
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
  const precio = normalizarPrecio(input.precio);
  try {
    await db.update(productos)
      .set({ nombre, detalle, precio, ...(input.activo === undefined ? {} : { activo: input.activo }) })
      .where(eq(productos.id, id));
    return { ok: true };
  } catch {
    return { error: "Ya existe un producto con ese nombre." };
  }
}

export async function desactivarProducto(db: DrizzleDb, id: number): Promise<{ ok: true }> {
  await db.update(productos).set({ activo: false }).where(eq(productos.id, id));
  return { ok: true };
}
