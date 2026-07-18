import { eq } from "drizzle-orm";
import type { DrizzleDb } from "@/db/client";
import { sedes } from "@/db/schema";
import { esViolacionUnica } from "@/lib/dbErrors";

export async function crearSede(
  db: DrizzleDb,
  nombre: string,
): Promise<{ id: number } | { error: string }> {
  const n = nombre.trim();
  if (!n) return { error: "El nombre es obligatorio." };
  try {
    const [row] = await db.insert(sedes).values({ nombre: n }).returning({ id: sedes.id });
    return { id: row.id };
  } catch (err) {
    if (esViolacionUnica(err)) return { error: "Ya existe una sede con ese nombre." };
    throw err;
  }
}

export async function editarSede(
  db: DrizzleDb,
  id: number,
  nombre: string,
): Promise<{ ok: true } | { error: string }> {
  const n = nombre.trim();
  if (!n) return { error: "El nombre es obligatorio." };
  try {
    await db.update(sedes).set({ nombre: n }).where(eq(sedes.id, id));
    return { ok: true };
  } catch (err) {
    if (esViolacionUnica(err)) return { error: "Ya existe una sede con ese nombre." };
    throw err;
  }
}

export async function toggleSedeActiva(db: DrizzleDb, id: number): Promise<{ ok: true }> {
  const [actual] = await db.select({ activo: sedes.activo }).from(sedes).where(eq(sedes.id, id));
  if (actual) await db.update(sedes).set({ activo: !actual.activo }).where(eq(sedes.id, id));
  return { ok: true };
}
