import { asc, eq } from "drizzle-orm";
import type { DrizzleDb } from "@/db/client";
import { sedes } from "@/db/schema";

export type SedeAdmin = { id: number; nombre: string; activo: boolean };

export async function listarSedes(db: DrizzleDb): Promise<SedeAdmin[]> {
  return db
    .select({ id: sedes.id, nombre: sedes.nombre, activo: sedes.activo })
    .from(sedes)
    .orderBy(asc(sedes.nombre));
}

export async function sedesActivas(db: DrizzleDb): Promise<{ id: number; nombre: string }[]> {
  return db
    .select({ id: sedes.id, nombre: sedes.nombre })
    .from(sedes)
    .where(eq(sedes.activo, true))
    .orderBy(asc(sedes.nombre));
}

/** true solo si la sede existe y está activa (para bloquear el canje en sedes desactivadas). */
export async function sedeEstaActiva(db: DrizzleDb, sedeId: number): Promise<boolean> {
  const [row] = await db.select({ activo: sedes.activo }).from(sedes).where(eq(sedes.id, sedeId));
  return !!row?.activo;
}
