import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
// Tipo genérico (no atado al driver neon-http) para que el dominio pueda
// recibir tanto el cliente real (neon-http) como el cliente de test (PGlite).
export type DrizzleDb = PgDatabase<PgQueryResultHKT, typeof schema>;
