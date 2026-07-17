import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import * as schema from "@/db/schema";

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

// Crea las tablas directamente (sin depender de archivos de migración).
async function crearEsquema(db: DrizzleDb) {
  await db.execute(sql`CREATE TYPE rol AS ENUM ('admin','taquilla')`);
  await db.execute(sql`CREATE TYPE estado_boleto AS ENUM ('activo','canjeado','anulado')`);
  await db.execute(sql`
    CREATE TABLE sedes (id serial PRIMARY KEY, nombre text NOT NULL UNIQUE)`);
  await db.execute(sql`
    CREATE TABLE usuarios (
      id serial PRIMARY KEY, usuario text NOT NULL UNIQUE, password_hash text NOT NULL,
      rol rol, sede_id integer REFERENCES sedes(id),
      puede_admin boolean NOT NULL DEFAULT false, puede_taquilla boolean NOT NULL DEFAULT false,
      activo boolean NOT NULL DEFAULT true, creado_en timestamp NOT NULL DEFAULT now())`);
  await db.execute(sql`
    CREATE TABLE empresas (
      id serial PRIMARY KEY, nombre text NOT NULL UNIQUE, prefijo text NOT NULL,
      contacto text, telefono text, notas text, creado_en timestamp NOT NULL DEFAULT now())`);
  await db.execute(sql`
    CREATE TABLE lotes (
      id serial PRIMARY KEY, empresa_id integer NOT NULL REFERENCES empresas(id),
      descripcion text NOT NULL, cantidad integer NOT NULL, fecha_vencimiento date NOT NULL,
      creado_por integer REFERENCES usuarios(id), creado_en timestamp NOT NULL DEFAULT now(),
      anulado_en timestamp, anulado_motivo text, anulado_por integer REFERENCES usuarios(id))`);
  await db.execute(sql`
    CREATE TABLE boletos (
      id serial PRIMARY KEY, lote_id integer NOT NULL REFERENCES lotes(id),
      codigo text NOT NULL, token text NOT NULL,
      estado estado_boleto NOT NULL DEFAULT 'activo',
      canje_sede_id integer REFERENCES sedes(id), canje_portador_nombre text,
      canje_portador_dni text, canje_fecha timestamp,
      canje_usuario_id integer REFERENCES usuarios(id),
      creado_en timestamp NOT NULL DEFAULT now())`);
  await db.execute(sql`CREATE UNIQUE INDEX boletos_codigo_idx ON boletos(codigo)`);
  await db.execute(sql`CREATE UNIQUE INDEX boletos_token_idx ON boletos(token)`);
  await db.execute(sql`CREATE INDEX boletos_lote_idx ON boletos(lote_id)`);
  await db.execute(sql`CREATE INDEX boletos_estado_idx ON boletos(estado)`);
  await db.execute(sql`
    CREATE TABLE usuario_sedes (
      usuario_id integer NOT NULL REFERENCES usuarios(id),
      sede_id integer NOT NULL REFERENCES sedes(id),
      PRIMARY KEY (usuario_id, sede_id))`);
  await db.execute(sql`
    CREATE TABLE lote_sedes (
      lote_id integer NOT NULL REFERENCES lotes(id),
      sede_id integer NOT NULL REFERENCES sedes(id),
      PRIMARY KEY (lote_id, sede_id))`);
}

export async function createTestDb() {
  const pg = new PGlite();
  const db = drizzle(pg, { schema });
  await crearEsquema(db);
  return { db, close: () => pg.close() };
}
