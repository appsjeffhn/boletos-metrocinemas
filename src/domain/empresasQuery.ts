import type { DrizzleDb } from "@/db/client";
import { empresas } from "@/db/schema";

export function listarEmpresas(db: DrizzleDb) {
  return db.select().from(empresas).orderBy(empresas.nombre);
}
