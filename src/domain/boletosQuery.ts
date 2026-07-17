import { eq } from "drizzle-orm";
import type { DrizzleDb } from "@/db/client";
import { boletos } from "@/db/schema";

export function boletosDeLote(db: DrizzleDb, loteId: number) {
  return db.select({ codigo: boletos.codigo, token: boletos.token })
    .from(boletos).where(eq(boletos.loteId, loteId)).orderBy(boletos.id);
}
