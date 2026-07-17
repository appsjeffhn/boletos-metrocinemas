# Boletos Digitales — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web app para generar boletos digitales con QR únicos, validar el canje en taquilla (canje único, anti-fraude, vencimiento) y sacar reportes por empresa/sede/fecha.

**Architecture:** Next.js (App Router, TypeScript) con Server Actions para la lógica. Postgres gestionado (Neon) en producción; PGlite en memoria para tests. La regla anti-duplicidad se garantiza con un `UPDATE ... WHERE estado='activo' RETURNING` atómico. El QR contiene solo una URL con un `token` aleatorio de alta entropía.

**Tech Stack:** Next.js 16 · TypeScript · Drizzle ORM · Postgres (Neon) / PGlite (tests) · Vitest · bcryptjs · jose (sesiones JWT en cookie httpOnly) · qrcode (generación) · html5-qrcode (escaneo) · Tailwind CSS.

## Global Constraints

- Sedes fijas (7): `NOVACENTRO`, `PLAZA AMERICA`, `PLAZA MIRAFLORES`, `MEGAMALL`, `DANLI`, `SANTA ROSA DE COPAN`, `PUERTO CORTES`.
- Formato de código legible: `M{PREFIJO}-XXXXXX` donde `PREFIJO` son las iniciales de la empresa (1–6 chars A–Z/0–9) y `XXXXXX` son 6 caracteres del alfabeto Crockford Base32 sin ambiguos (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`). Ej.: empresa "MOK" → `MMOK-7F3K9Q`; "Coca Cola" (prefijo `CC`) → `MCC-7F3K9Q`. La `M` inicial (Metrocinemas) siempre se antepone; el prefijo se guarda por empresa.
- `token` del QR: 32 caracteres hex mínimo (≥128 bits) generados con CSPRNG (`crypto.randomBytes`).
- Roles: `admin` | `taquilla`. Todo usuario `taquilla` tiene `sede_id`; `admin` no.
- Estados de boleto: `activo` | `canjeado` | `anulado`.
- El canje debe ser atómico: prohibido leer-y-luego-escribir sin guardia condicional sobre `estado='activo'`.
- Idioma de la UI: español.
- Node 24, gestor de paquetes `npm`.

---

## File Structure

```
package.json, tsconfig.json, next.config.ts, vitest.config.ts,
drizzle.config.ts, .env.example, .gitignore, postcss.config.mjs

src/
  db/
    schema.ts        # Tablas Drizzle (sedes, usuarios, empresas, lotes, boletos) + enums
    client.ts        # Cliente Postgres (Neon) para runtime
  test/
    db.ts            # Helper: crea DB PGlite en memoria + migra el schema (para tests)
  lib/
    codigo.ts        # generarCodigo(), generarToken()
    auth.ts          # hashPassword(), verifyPassword(), signSession(), verifySession()
    session.ts       # getCurrentUser(), setSessionCookie(), clearSessionCookie()
  domain/
    boletos.ts       # generarLote(), obtenerBoletoPorToken(), canjearBoleto()
    reportes.ts      # reportePorEmpresa(), reporteGeneral()
  app/
    layout.tsx, globals.css, page.tsx
    login/page.tsx, login/actions.ts
    (admin)/layout.tsx
    (admin)/empresas/page.tsx, empresas/actions.ts
    (admin)/lotes/page.tsx, lotes/actions.ts, lotes/[id]/imprimir/page.tsx
    (admin)/reportes/page.tsx, reportes/exportar/route.ts
    (admin)/usuarios/page.tsx, usuarios/actions.ts
    taquilla/page.tsx                 # escáner
    canje/[token]/page.tsx, canje/[token]/actions.ts
    api/qr/[token]/route.ts           # PNG del QR
  middleware.ts      # Protección de rutas por rol
  components/        # Scanner.tsx, ResultadoCanje.tsx, etc.
scripts/
  seed.ts            # Inserta las 7 sedes + primer admin
tests/
  <espejo de src/ para unit/integration tests>
```

---

## Task 1: Scaffolding del proyecto

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore`, `.env.example`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Produces: proyecto Next.js compilable + runner Vitest funcionando.

- [ ] **Step 1: Inicializar Next.js con TypeScript y Tailwind**

Run (no interactivo):
```bash
npx create-next-app@latest . --ts --app --tailwind --eslint --src-dir --import-alias "@/*" --no-turbopack --use-npm --yes
```
Si el directorio no está vacío por los `docs/`, aceptar continuar. Confirmar que se crea `src/app/`.

- [ ] **Step 2: Instalar dependencias del proyecto**

```bash
npm i drizzle-orm postgres @neondatabase/serverless bcryptjs jose qrcode html5-qrcode
npm i -D drizzle-kit vitest @vitejs/plugin-react @electric-sql/pglite @types/qrcode @types/bcryptjs
```

- [ ] **Step 3: Crear `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
  },
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
});
```

- [ ] **Step 4: Añadir scripts a `package.json`**

En `"scripts"` agregar:
```json
"test": "vitest run",
"test:watch": "vitest",
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:seed": "tsx scripts/seed.ts"
```
Instalar `tsx`: `npm i -D tsx`.

- [ ] **Step 5: Crear `.env.example`**

```
# Postgres (Neon en producción)
DATABASE_URL="postgres://user:pass@host/db?sslmode=require"
# Secreto para firmar sesiones (>=32 chars aleatorios)
SESSION_SECRET="cambia-esto-por-un-secreto-largo-y-aleatorio"
# URL pública base para los QR
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

- [ ] **Step 6: Escribir smoke test**

`tests/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("suma", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 7: Correr el test (debe pasar) y verificar build de tipos**

```bash
npm test
npx tsc --noEmit
```
Expected: test PASS; `tsc` sin errores.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Vitest + deps"
```

---

## Task 2: Schema de base de datos + helper de tests

**Files:**
- Create: `src/db/schema.ts`, `src/db/client.ts`, `src/test/db.ts`, `drizzle.config.ts`
- Test: `tests/db/schema.test.ts`

**Interfaces:**
- Produces:
  - Tablas Drizzle exportadas: `sedes`, `usuarios`, `empresas`, `lotes`, `boletos`.
  - Enums: `rolEnum` (`admin`|`taquilla`), `estadoBoletoEnum` (`activo`|`canjeado`|`anulado`).
  - `createTestDb(): Promise<{ db: DrizzleDb; close: () => Promise<void> }>` — DB PGlite migrada en memoria.
  - `type DrizzleDb` — tipo del cliente Drizzle usado por todo el dominio.

- [ ] **Step 1: Escribir el schema** — `src/db/schema.ts`

```ts
import {
  pgTable, pgEnum, serial, text, integer, timestamp, date, boolean, uniqueIndex, index,
} from "drizzle-orm/pg-core";

export const rolEnum = pgEnum("rol", ["admin", "taquilla"]);
export const estadoBoletoEnum = pgEnum("estado_boleto", ["activo", "canjeado", "anulado"]);

export const sedes = pgTable("sedes", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull().unique(),
});

export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  usuario: text("usuario").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  rol: rolEnum("rol").notNull(),
  sedeId: integer("sede_id").references(() => sedes.id),
  activo: boolean("activo").notNull().default(true),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const empresas = pgTable("empresas", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull().unique(),
  prefijo: text("prefijo").notNull(), // iniciales, ej. "MOK"; el código será M + prefijo + "-XXXXXX"
  contacto: text("contacto"),
  notas: text("notas"),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const lotes = pgTable("lotes", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresa_id").notNull().references(() => empresas.id),
  descripcion: text("descripcion").notNull(),
  cantidad: integer("cantidad").notNull(),
  fechaVencimiento: date("fecha_vencimiento").notNull(),
  creadoPor: integer("creado_por").references(() => usuarios.id),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const boletos = pgTable("boletos", {
  id: serial("id").primaryKey(),
  loteId: integer("lote_id").notNull().references(() => lotes.id),
  codigo: text("codigo").notNull(),
  token: text("token").notNull(),
  estado: estadoBoletoEnum("estado").notNull().default("activo"),
  canjeSedeId: integer("canje_sede_id").references(() => sedes.id),
  canjePortadorNombre: text("canje_portador_nombre"),
  canjePortadorDni: text("canje_portador_dni"),
  canjeFecha: timestamp("canje_fecha"),
  canjeUsuarioId: integer("canje_usuario_id").references(() => usuarios.id),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
}, (t) => ({
  codigoIdx: uniqueIndex("boletos_codigo_idx").on(t.codigo),
  tokenIdx: uniqueIndex("boletos_token_idx").on(t.token),
  loteIdx: index("boletos_lote_idx").on(t.loteId),
  estadoIdx: index("boletos_estado_idx").on(t.estado),
}));
```

- [ ] **Step 2: Cliente runtime** — `src/db/client.ts`

```ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
export type DrizzleDb = typeof db;
```

- [ ] **Step 3: `drizzle.config.ts`**

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- [ ] **Step 4: Helper de test con PGlite** — `src/test/db.ts`

```ts
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
      rol rol NOT NULL, sede_id integer REFERENCES sedes(id),
      activo boolean NOT NULL DEFAULT true, creado_en timestamp NOT NULL DEFAULT now())`);
  await db.execute(sql`
    CREATE TABLE empresas (
      id serial PRIMARY KEY, nombre text NOT NULL UNIQUE, prefijo text NOT NULL,
      contacto text, notas text, creado_en timestamp NOT NULL DEFAULT now())`);
  await db.execute(sql`
    CREATE TABLE lotes (
      id serial PRIMARY KEY, empresa_id integer NOT NULL REFERENCES empresas(id),
      descripcion text NOT NULL, cantidad integer NOT NULL, fecha_vencimiento date NOT NULL,
      creado_por integer REFERENCES usuarios(id), creado_en timestamp NOT NULL DEFAULT now())`);
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
}

export async function createTestDb() {
  const pg = new PGlite();
  const db = drizzle(pg, { schema });
  await crearEsquema(db);
  return { db, close: () => pg.close() };
}
```

- [ ] **Step 5: Escribir el test** — `tests/db/schema.test.ts`

```ts
import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { sedes } from "@/db/schema";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("schema", () => {
  it("inserta y lee una sede", async () => {
    const t = await createTestDb();
    close = t.close;
    await t.db.insert(sedes).values({ nombre: "MEGAMALL" });
    const filas = await t.db.select().from(sedes);
    expect(filas).toHaveLength(1);
    expect(filas[0].nombre).toBe("MEGAMALL");
  });
});
```

- [ ] **Step 6: Correr test**

Run: `npm test -- tests/db/schema.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(db): schema + PGlite test harness"
```

---

## Task 3: Generación de código y token

**Files:**
- Create: `src/lib/codigo.ts`
- Test: `tests/lib/codigo.test.ts`

**Interfaces:**
- Produces:
  - `normalizarPrefijo(nombre: string): string` → deriva iniciales A–Z/0–9 (máx 6) desde un texto (para auto-sugerir); si queda vacío devuelve `"X"`.
  - `generarCodigo(prefijo: string): string` → `M{PREFIJO}-XXXXXX` (6 chars Crockford Base32 sin ambiguos). El `prefijo` se normaliza (mayúsculas, solo A–Z/0–9, máx 6).
  - `generarToken(): string` → 32 chars hex (16 bytes CSPRNG).

- [ ] **Step 1: Test** — `tests/lib/codigo.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { generarCodigo, generarToken, normalizarPrefijo } from "@/lib/codigo";

describe("normalizarPrefijo", () => {
  it("deriva iniciales en mayúsculas, máx 6, sin símbolos", () => {
    expect(normalizarPrefijo("MOK")).toBe("MOK");
    expect(normalizarPrefijo("coca cola")).toBe("COCACO");
    expect(normalizarPrefijo("!!!")).toBe("X");
  });
});

describe("generarCodigo", () => {
  it("cumple el formato M{PREFIJO}-XXXXXX sin caracteres ambiguos", () => {
    for (let i = 0; i < 200; i++) {
      expect(generarCodigo("MOK")).toMatch(/^MMOK-[0-9ABCDEFGHJKMNPQRSTVWXYZ]{6}$/);
    }
    expect(generarCodigo("CC")).toMatch(/^MCC-[0-9ABCDEFGHJKMNPQRSTVWXYZ]{6}$/);
  });
  it("normaliza el prefijo recibido", () => {
    expect(generarCodigo("cc")).toMatch(/^MCC-/);
  });
  it("genera valores altamente únicos", () => {
    const set = new Set(Array.from({ length: 5000 }, () => generarCodigo("MOK")));
    expect(set.size).toBeGreaterThan(4990);
  });
});

describe("generarToken", () => {
  it("es hex de 32 chars y único", () => {
    const a = generarToken();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toBe(generarToken());
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npm test -- tests/lib/codigo.test.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar** — `src/lib/codigo.ts`

```ts
import { randomBytes, randomInt } from "crypto";

const ALFABETO = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford, sin I L O U

export function normalizarPrefijo(nombre: string): string {
  const limpio = nombre.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  return limpio || "X";
}

export function generarCodigo(prefijo: string): string {
  const p = normalizarPrefijo(prefijo);
  let s = "";
  for (let i = 0; i < 6; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return `M${p}-${s}`;
}

export function generarToken(): string {
  return randomBytes(16).toString("hex");
}
```

- [ ] **Step 4: Correr test**

Run: `npm test -- tests/lib/codigo.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(lib): generación de código y token"
```

---

## Task 4: Autenticación (hash + sesiones)

**Files:**
- Create: `src/lib/auth.ts`
- Test: `tests/lib/auth.test.ts`

**Interfaces:**
- Produces:
  - `hashPassword(plain: string): Promise<string>`
  - `verifyPassword(plain: string, hash: string): Promise<boolean>`
  - `type SessionPayload = { userId: number; rol: "admin" | "taquilla"; sedeId: number | null }`
  - `signSession(p: SessionPayload): Promise<string>`
  - `verifySession(token: string): Promise<SessionPayload | null>`

- [ ] **Step 1: Test** — `tests/lib/auth.test.ts`

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { hashPassword, verifyPassword, signSession, verifySession } from "@/lib/auth";

beforeAll(() => { process.env.SESSION_SECRET = "test-secret-de-al-menos-32-caracteres!!"; });

describe("password", () => {
  it("verifica correcta e incorrecta", async () => {
    const h = await hashPassword("Secreta123");
    expect(await verifyPassword("Secreta123", h)).toBe(true);
    expect(await verifyPassword("mala", h)).toBe(false);
  });
});

describe("sesión", () => {
  it("firma y verifica el payload", async () => {
    const t = await signSession({ userId: 7, rol: "taquilla", sedeId: 3 });
    const p = await verifySession(t);
    expect(p).toEqual({ userId: 7, rol: "taquilla", sedeId: 3 });
  });
  it("rechaza token manipulado", async () => {
    expect(await verifySession("basura.invalida.xyz")).toBeNull();
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npm test -- tests/lib/auth.test.ts` → FAIL.

- [ ] **Step 3: Implementar** — `src/lib/auth.ts`

```ts
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export type SessionPayload = {
  userId: number;
  rol: "admin" | "taquilla";
  sedeId: number | null;
};

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET!);

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function signSession(p: SessionPayload): Promise<string> {
  return new SignJWT({ ...p })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      userId: payload.userId as number,
      rol: payload.rol as "admin" | "taquilla",
      sedeId: (payload.sedeId as number | null) ?? null,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Correr test** → PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(auth): hash de contraseñas y sesiones JWT"
```

---

## Task 5: Dominio — generar lote de boletos

**Files:**
- Create: `src/domain/boletos.ts` (primera parte)
- Test: `tests/domain/generar-lote.test.ts`

**Interfaces:**
- Consumes: `generarCodigo`, `generarToken` (Task 3); tablas `empresas`, `lotes`, `boletos`; `DrizzleDb`.
- Produces:
  - `type NuevoLote = { empresaId: number; descripcion: string; cantidad: number; fechaVencimiento: string; creadoPor?: number }`
  - `generarLote(db: DrizzleDb, input: NuevoLote): Promise<{ loteId: number; boletos: { id: number; codigo: string; token: string }[] }>`

- [ ] **Step 1: Test** — `tests/domain/generar-lote.test.ts`

```ts
import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { empresas, boletos } from "@/db/schema";
import { generarLote } from "@/domain/boletos";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("generarLote", () => {
  it("crea N boletos únicos ligados a empresa y lote", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Coca-Cola", prefijo: "CC" }).returning();
    const res = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "Cortesías", cantidad: 50,
      fechaVencimiento: "2026-12-31",
    });
    expect(res.boletos).toHaveLength(50);
    const codigos = new Set(res.boletos.map((b) => b.codigo));
    const tokens = new Set(res.boletos.map((b) => b.token));
    expect(codigos.size).toBe(50);
    expect(tokens.size).toBe(50);
    expect(res.boletos.every((b) => b.codigo.startsWith("MCC-"))).toBe(true);
    const enDb = await t.db.select().from(boletos);
    expect(enDb).toHaveLength(50);
    expect(enDb.every((b) => b.estado === "activo")).toBe(true);
  });
});
```

- [ ] **Step 2: Verificar que falla** → FAIL.

- [ ] **Step 3: Implementar** — `src/domain/boletos.ts`

```ts
import { eq, and } from "drizzle-orm";
import type { DrizzleDb } from "@/db/client";
import { lotes, boletos, empresas } from "@/db/schema";
import { generarCodigo, generarToken } from "@/lib/codigo";

export type NuevoLote = {
  empresaId: number;
  descripcion: string;
  cantidad: number;
  fechaVencimiento: string; // ISO date YYYY-MM-DD
  creadoPor?: number;
};

export async function generarLote(db: DrizzleDb, input: NuevoLote) {
  const [emp] = await db.select({ prefijo: empresas.prefijo })
    .from(empresas).where(eq(empresas.id, input.empresaId));
  if (!emp) throw new Error("Empresa no encontrada");

  const [lote] = await db.insert(lotes).values({
    empresaId: input.empresaId,
    descripcion: input.descripcion,
    cantidad: input.cantidad,
    fechaVencimiento: input.fechaVencimiento,
    creadoPor: input.creadoPor ?? null,
  }).returning();

  const filas = Array.from({ length: input.cantidad }, () => ({
    loteId: lote.id,
    codigo: generarCodigo(emp.prefijo),
    token: generarToken(),
  }));

  const insertados = await db.insert(boletos).values(filas)
    .returning({ id: boletos.id, codigo: boletos.codigo, token: boletos.token });

  return { loteId: lote.id, boletos: insertados };
}
```

> Nota: el índice único sobre `codigo`/`token` garantiza a nivel de BD que no haya
> colisiones; con 6 chars Base32 (~10⁹) y lotes pequeños la probabilidad es ínfima.

- [ ] **Step 4: Correr test** → PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(domain): generar lote de boletos"
```

---

## Task 6: Dominio — validar y canjear boleto (atómico)

**Files:**
- Modify: `src/domain/boletos.ts`
- Test: `tests/domain/canjear.test.ts`

**Interfaces:**
- Consumes: tablas `boletos`, `lotes`, `empresas`, `sedes`; `DrizzleDb`.
- Produces:
  - `type BoletoInfo = { codigo: string; empresa: string; estado: "activo"|"canjeado"|"anulado"; fechaVencimiento: string; canje?: { sede: string|null; fecha: Date|null; portadorNombre: string|null } }`
  - `obtenerBoletoPorToken(db, token, hoy?): Promise<{ ok: true; boleto: BoletoInfo } | { ok: false; razon: "invalido"|"canjeado"|"anulado"|"vencido"; boleto?: BoletoInfo }>`
  - `type DatosCanje = { sedeId: number; portadorNombre: string; portadorDni: string; usuarioId: number }`
  - `canjearBoleto(db, token, datos, hoy?): Promise<{ ok: true; codigo: string } | { ok: false; razon: "invalido"|"canjeado"|"anulado"|"vencido" }>`
  - Regla de fecha: `hoy` es `YYYY-MM-DD`; vencido si `fechaVencimiento < hoy` (el día del vencimiento aún es válido). `hoy` por defecto = fecha actual del sistema.

- [ ] **Step 1: Test** — `tests/domain/canjear.test.ts`

```ts
import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { empresas, sedes, usuarios, boletos } from "@/db/schema";
import { generarLote, obtenerBoletoPorToken, canjearBoleto } from "@/domain/boletos";
import { eq } from "drizzle-orm";

let close: () => Promise<void>;
afterEach(() => close?.());

async function setup(fechaVenc = "2026-12-31") {
  const t = await createTestDb(); close = t.close;
  const [emp] = await t.db.insert(empresas).values({ nombre: "Empresa X", prefijo: "EX" }).returning();
  const [sede] = await t.db.insert(sedes).values({ nombre: "MEGAMALL" }).returning();
  const [user] = await t.db.insert(usuarios).values({
    usuario: "taq1", passwordHash: "x", rol: "taquilla", sedeId: sede.id,
  }).returning();
  const lote = await generarLote(t.db, {
    empresaId: emp.id, descripcion: "L", cantidad: 1, fechaVencimiento: fechaVenc,
  });
  return { t, sede, user, token: lote.boletos[0].token };
}
const datos = (sedeId: number, usuarioId: number) => ({
  sedeId, usuarioId, portadorNombre: "Juan", portadorDni: "0801-1990-12345",
});

describe("obtenerBoletoPorToken", () => {
  it("token inexistente → invalido", async () => {
    const { t } = await setup();
    const r = await obtenerBoletoPorToken(t.db, "noexiste");
    expect(r).toEqual({ ok: false, razon: "invalido" });
  });
  it("activo válido → ok", async () => {
    const { t, token } = await setup();
    const r = await obtenerBoletoPorToken(t.db, token, "2026-07-16");
    expect(r.ok).toBe(true);
  });
  it("vencido → razon vencido", async () => {
    const { t, token } = await setup("2026-01-01");
    const r = await obtenerBoletoPorToken(t.db, token, "2026-07-16");
    expect(r).toMatchObject({ ok: false, razon: "vencido" });
  });
});

describe("canjearBoleto", () => {
  it("canjea un boleto activo y guarda los datos", async () => {
    const { t, sede, user, token } = await setup();
    const r = await canjearBoleto(t.db, token, datos(sede.id, user.id), "2026-07-16");
    expect(r.ok).toBe(true);
    const [b] = await t.db.select().from(boletos).where(eq(boletos.token, token));
    expect(b.estado).toBe("canjeado");
    expect(b.canjePortadorNombre).toBe("Juan");
    expect(b.canjeSedeId).toBe(sede.id);
  });
  it("no permite doble canje", async () => {
    const { t, sede, user, token } = await setup();
    const primero = await canjearBoleto(t.db, token, datos(sede.id, user.id), "2026-07-16");
    const segundo = await canjearBoleto(t.db, token, datos(sede.id, user.id), "2026-07-16");
    expect(primero.ok).toBe(true);
    expect(segundo).toMatchObject({ ok: false, razon: "canjeado" });
  });
  it("rechaza boleto vencido", async () => {
    const { t, sede, user, token } = await setup("2026-01-01");
    const r = await canjearBoleto(t.db, token, datos(sede.id, user.id), "2026-07-16");
    expect(r).toMatchObject({ ok: false, razon: "vencido" });
  });
  it("token inexistente → invalido", async () => {
    const { t, sede, user } = await setup();
    const r = await canjearBoleto(t.db, "noexiste", datos(sede.id, user.id), "2026-07-16");
    expect(r).toMatchObject({ ok: false, razon: "invalido" });
  });
});
```

- [ ] **Step 2: Verificar que falla** → FAIL.

- [ ] **Step 3: Implementar (añadir a `src/domain/boletos.ts`)**

```ts
import { sedes, empresas } from "@/db/schema";

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export type BoletoInfo = {
  codigo: string;
  empresa: string;
  estado: "activo" | "canjeado" | "anulado";
  fechaVencimiento: string;
  canje?: { sede: string | null; fecha: Date | null; portadorNombre: string | null };
};

type Razon = "invalido" | "canjeado" | "anulado" | "vencido";

async function cargar(db: DrizzleDb, token: string) {
  const [row] = await db
    .select({
      id: boletos.id, estado: boletos.estado, codigo: boletos.codigo,
      fechaVencimiento: lotes.fechaVencimiento, empresa: empresas.nombre,
      canjeFecha: boletos.canjeFecha, canjePortadorNombre: boletos.canjePortadorNombre,
      canjeSedeNombre: sedes.nombre,
    })
    .from(boletos)
    .innerJoin(lotes, eq(boletos.loteId, lotes.id))
    .innerJoin(empresas, eq(lotes.empresaId, empresas.id))
    .leftJoin(sedes, eq(boletos.canjeSedeId, sedes.id))
    .where(eq(boletos.token, token));
  return row;
}

function aInfo(row: NonNullable<Awaited<ReturnType<typeof cargar>>>): BoletoInfo {
  return {
    codigo: row.codigo, empresa: row.empresa, estado: row.estado,
    fechaVencimiento: row.fechaVencimiento,
    canje: { sede: row.canjeSedeNombre, fecha: row.canjeFecha, portadorNombre: row.canjePortadorNombre },
  };
}

export async function obtenerBoletoPorToken(db: DrizzleDb, token: string, hoy = hoyISO()) {
  const row = await cargar(db, token);
  if (!row) return { ok: false as const, razon: "invalido" as Razon };
  const info = aInfo(row);
  if (row.estado === "canjeado") return { ok: false as const, razon: "canjeado" as Razon, boleto: info };
  if (row.estado === "anulado") return { ok: false as const, razon: "anulado" as Razon, boleto: info };
  if (row.fechaVencimiento < hoy) return { ok: false as const, razon: "vencido" as Razon, boleto: info };
  return { ok: true as const, boleto: info };
}

export type DatosCanje = {
  sedeId: number; portadorNombre: string; portadorDni: string; usuarioId: number;
};

export async function canjearBoleto(db: DrizzleDb, token: string, datos: DatosCanje, hoy = hoyISO()) {
  const previo = await obtenerBoletoPorToken(db, token, hoy);
  if (!previo.ok) return { ok: false as const, razon: previo.razon };

  // Guardia atómica: solo cambia si sigue 'activo'. Un segundo canje concurrente falla aquí.
  const actualizado = await db.update(boletos)
    .set({
      estado: "canjeado", canjeSedeId: datos.sedeId,
      canjePortadorNombre: datos.portadorNombre, canjePortadorDni: datos.portadorDni,
      canjeFecha: new Date(), canjeUsuarioId: datos.usuarioId,
    })
    .where(and(eq(boletos.token, token), eq(boletos.estado, "activo")))
    .returning({ codigo: boletos.codigo });

  if (actualizado.length === 0) return { ok: false as const, razon: "canjeado" as Razon };
  return { ok: true as const, codigo: actualizado[0].codigo };
}
```

- [ ] **Step 4: Correr test** → PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(domain): validar y canjear boleto atómico"
```

---

## Task 7: Dominio — reportes

**Files:**
- Create: `src/domain/reportes.ts`
- Test: `tests/domain/reportes.test.ts`

**Interfaces:**
- Consumes: tablas `boletos`, `lotes`, `empresas`; `DrizzleDb`.
- Produces:
  - `type ReporteEmpresa = { empresaId: number; empresa: string; emitidos: number; canjeados: number; pendientes: number; anulados: number }`
  - `reportePorEmpresa(db): Promise<ReporteEmpresa[]>`
  - `type FiltroCanjes = { desde?: string; hasta?: string; sedeId?: number; empresaId?: number }`
  - `listarCanjes(db, filtro): Promise<{ codigo: string; empresa: string; sede: string|null; portadorNombre: string|null; portadorDni: string|null; fecha: Date|null }[]>`

- [ ] **Step 1: Test** — `tests/domain/reportes.test.ts`

```ts
import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { empresas, sedes, usuarios } from "@/db/schema";
import { generarLote, canjearBoleto } from "@/domain/boletos";
import { reportePorEmpresa, listarCanjes } from "@/domain/reportes";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("reportePorEmpresa", () => {
  it("cuadra emitidos = canjeados + pendientes + anulados", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Coca-Cola", prefijo: "CC" }).returning();
    const [sede] = await t.db.insert(sedes).values({ nombre: "DANLI" }).returning();
    const [u] = await t.db.insert(usuarios).values({ usuario: "t", passwordHash: "x", rol: "taquilla", sedeId: sede.id }).returning();
    const lote = await generarLote(t.db, { empresaId: emp.id, descripcion: "L", cantidad: 5, fechaVencimiento: "2026-12-31" });
    await canjearBoleto(t.db, lote.boletos[0].token, { sedeId: sede.id, usuarioId: u.id, portadorNombre: "A", portadorDni: "1" }, "2026-07-16");
    await canjearBoleto(t.db, lote.boletos[1].token, { sedeId: sede.id, usuarioId: u.id, portadorNombre: "B", portadorDni: "2" }, "2026-07-16");

    const rep = await reportePorEmpresa(t.db);
    expect(rep).toHaveLength(1);
    expect(rep[0]).toMatchObject({ empresa: "Coca-Cola", emitidos: 5, canjeados: 2, pendientes: 3, anulados: 0 });
  });
});

describe("listarCanjes", () => {
  it("filtra por empresa y trae los datos del portador", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Coca-Cola", prefijo: "CC" }).returning();
    const [sede] = await t.db.insert(sedes).values({ nombre: "DANLI" }).returning();
    const [u] = await t.db.insert(usuarios).values({ usuario: "t", passwordHash: "x", rol: "taquilla", sedeId: sede.id }).returning();
    const lote = await generarLote(t.db, { empresaId: emp.id, descripcion: "L", cantidad: 2, fechaVencimiento: "2026-12-31" });
    await canjearBoleto(t.db, lote.boletos[0].token, { sedeId: sede.id, usuarioId: u.id, portadorNombre: "Juan", portadorDni: "0801" }, "2026-07-16");

    const filas = await listarCanjes(t.db, { empresaId: emp.id });
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ empresa: "Coca-Cola", sede: "DANLI", portadorNombre: "Juan", portadorDni: "0801" });
  });
});
```

- [ ] **Step 2: Verificar que falla** → FAIL.

- [ ] **Step 3: Implementar** — `src/domain/reportes.ts`

```ts
import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { DrizzleDb } from "@/db/client";
import { boletos, lotes, empresas, sedes } from "@/db/schema";

export type ReporteEmpresa = {
  empresaId: number; empresa: string;
  emitidos: number; canjeados: number; pendientes: number; anulados: number;
};

export async function reportePorEmpresa(db: DrizzleDb): Promise<ReporteEmpresa[]> {
  const rows = await db
    .select({
      empresaId: empresas.id, empresa: empresas.nombre,
      emitidos: sql<number>`count(${boletos.id})::int`,
      canjeados: sql<number>`count(*) filter (where ${boletos.estado} = 'canjeado')::int`,
      pendientes: sql<number>`count(*) filter (where ${boletos.estado} = 'activo')::int`,
      anulados: sql<number>`count(*) filter (where ${boletos.estado} = 'anulado')::int`,
    })
    .from(empresas)
    .leftJoin(lotes, eq(lotes.empresaId, empresas.id))
    .leftJoin(boletos, eq(boletos.loteId, lotes.id))
    .groupBy(empresas.id, empresas.nombre)
    .orderBy(empresas.nombre);
  return rows;
}

export type FiltroCanjes = { desde?: string; hasta?: string; sedeId?: number; empresaId?: number };

export async function listarCanjes(db: DrizzleDb, filtro: FiltroCanjes) {
  const cond = [eq(boletos.estado, "canjeado")];
  if (filtro.empresaId) cond.push(eq(lotes.empresaId, filtro.empresaId));
  if (filtro.sedeId) cond.push(eq(boletos.canjeSedeId, filtro.sedeId));
  if (filtro.desde) cond.push(gte(boletos.canjeFecha, new Date(filtro.desde)));
  if (filtro.hasta) cond.push(lte(boletos.canjeFecha, new Date(filtro.hasta + "T23:59:59")));

  return db
    .select({
      codigo: boletos.codigo, empresa: empresas.nombre, sede: sedes.nombre,
      portadorNombre: boletos.canjePortadorNombre, portadorDni: boletos.canjePortadorDni,
      fecha: boletos.canjeFecha,
    })
    .from(boletos)
    .innerJoin(lotes, eq(boletos.loteId, lotes.id))
    .innerJoin(empresas, eq(lotes.empresaId, empresas.id))
    .leftJoin(sedes, eq(boletos.canjeSedeId, sedes.id))
    .where(and(...cond))
    .orderBy(boletos.canjeFecha);
}
```

- [ ] **Step 4: Correr test** → PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(domain): reportes por empresa y listado de canjes"
```

---

## Task 8: Migraciones + seed (sedes y admin)

**Files:**
- Create: `scripts/seed.ts`
- Generate: `drizzle/` (archivos de migración)

**Interfaces:**
- Consumes: `hashPassword` (Task 4), schema, `db` runtime.
- Produces: script `npm run db:seed` que crea las 7 sedes (idempotente) y un usuario admin desde variables de entorno.

- [ ] **Step 1: Generar migraciones desde el schema**

```bash
npm run db:generate
```
Expected: crea `drizzle/0000_*.sql`. Commit incluirá estos archivos.

- [ ] **Step 2: Escribir el seed** — `scripts/seed.ts`

```ts
import "dotenv/config";
import { db } from "@/db/client";
import { sedes, usuarios } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";

const SEDES = [
  "NOVACENTRO", "PLAZA AMERICA", "PLAZA MIRAFLORES", "MEGAMALL",
  "DANLI", "SANTA ROSA DE COPAN", "PUERTO CORTES",
];

async function main() {
  for (const nombre of SEDES) {
    await db.insert(sedes).values({ nombre }).onConflictDoNothing();
  }

  const adminUser = process.env.ADMIN_USER ?? "admin";
  const adminPass = process.env.ADMIN_PASS ?? "cambiar123";
  const existe = await db.select().from(usuarios).where(eq(usuarios.usuario, adminUser));
  if (existe.length === 0) {
    await db.insert(usuarios).values({
      usuario: adminUser, passwordHash: await hashPassword(adminPass), rol: "admin",
    });
    console.log(`Admin creado: ${adminUser}`);
  } else {
    console.log("Admin ya existe, no se recrea.");
  }
  console.log("Seed completo.");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
```
Instalar `dotenv`: `npm i dotenv`.

- [ ] **Step 3: Verificación manual (contra una BD real o local)**

Con `DATABASE_URL` apuntando a una BD Postgres de prueba:
```bash
npm run db:migrate && ADMIN_USER=admin ADMIN_PASS=Metro2026 npm run db:seed
```
Expected: "Admin creado: admin" y 7 sedes. Correr de nuevo → "Admin ya existe" y sin duplicar sedes.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(db): migraciones + seed de sedes y admin"
```

---

## Task 9: Sesión en cookies + middleware de rutas + login

**Files:**
- Create: `src/lib/session.ts`, `src/middleware.ts`, `src/app/login/page.tsx`, `src/app/login/actions.ts`, `src/app/page.tsx` (redirección por rol)
- Test: `tests/lib/session.test.ts`

**Interfaces:**
- Consumes: `signSession`, `verifySession`, `SessionPayload` (Task 4); `verifyPassword`; tablas `usuarios`.
- Produces:
  - `getCurrentUser(): Promise<SessionPayload | null>` (lee cookie).
  - `setSessionCookie(token: string): Promise<void>`, `clearSessionCookie(): Promise<void>`.
  - `iniciarSesion(formData): Promise<{ error?: string }>` (server action).
  - Constante `COOKIE_NAME = "sesion"`.

- [ ] **Step 1: Test de la constante y forma del helper** — `tests/lib/session.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { COOKIE_NAME } from "@/lib/session";

describe("session", () => {
  it("expone el nombre de cookie", () => {
    expect(COOKIE_NAME).toBe("sesion");
  });
});
```
(La lectura/escritura de cookies depende de `next/headers` y se valida en el flujo E2E de la Task 13; aquí sólo fijamos el contrato.)

- [ ] **Step 2: Implementar `src/lib/session.ts`**

```ts
import { cookies } from "next/headers";
import { verifySession, type SessionPayload } from "@/lib/auth";

export const COOKIE_NAME = "sesion";

export async function getCurrentUser(): Promise<SessionPayload | null> {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function setSessionCookie(token: string) {
  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: 60 * 60 * 12,
  });
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}
```

- [ ] **Step 3: Middleware** — `src/middleware.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { COOKIE_NAME } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const sesion = token ? await verifySession(token) : null;

  const esAdmin = pathname.startsWith("/empresas") || pathname.startsWith("/lotes")
    || pathname.startsWith("/reportes") || pathname.startsWith("/usuarios");
  const esTaquilla = pathname.startsWith("/taquilla") || pathname.startsWith("/canje");

  if ((esAdmin || esTaquilla) && !sesion) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (esAdmin && sesion?.rol !== "admin") {
    return NextResponse.redirect(new URL("/taquilla", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/empresas/:path*", "/lotes/:path*", "/reportes/:path*", "/usuarios/:path*", "/taquilla/:path*", "/canje/:path*"],
};
```

- [ ] **Step 4: Login action** — `src/app/login/actions.ts`

```ts
"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { usuarios } from "@/db/schema";
import { verifyPassword, signSession } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";

export async function iniciarSesion(_prev: unknown, formData: FormData) {
  const usuario = String(formData.get("usuario") ?? "");
  const password = String(formData.get("password") ?? "");

  const [u] = await db.select().from(usuarios).where(eq(usuarios.usuario, usuario));
  if (!u || !u.activo || !(await verifyPassword(password, u.passwordHash))) {
    return { error: "Usuario o contraseña incorrectos" };
  }
  const token = await signSession({ userId: u.id, rol: u.rol, sedeId: u.sedeId });
  await setSessionCookie(token);
  redirect(u.rol === "admin" ? "/reportes" : "/taquilla");
}
```

- [ ] **Step 5: Login page** — `src/app/login/page.tsx`

```tsx
"use client";
import { useActionState } from "react";
import { iniciarSesion } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(iniciarSesion, { error: undefined });
  return (
    <main className="min-h-screen grid place-items-center bg-neutral-950 text-white p-4">
      <form action={action} className="w-full max-w-sm space-y-4 bg-neutral-900 p-6 rounded-xl">
        <h1 className="text-xl font-bold">Metrocinemas — Boletos</h1>
        <input name="usuario" placeholder="Usuario" className="w-full p-3 rounded bg-neutral-800" required />
        <input name="password" type="password" placeholder="Contraseña" className="w-full p-3 rounded bg-neutral-800" required />
        {state?.error && <p className="text-red-400 text-sm">{state.error}</p>}
        <button disabled={pending} className="w-full p-3 rounded bg-red-600 font-semibold disabled:opacity-50">
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 6: Home redirige por rol** — `src/app/page.tsx`

```tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export default async function Home() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  redirect(u.rol === "admin" ? "/reportes" : "/taquilla");
}
```

- [ ] **Step 7: Correr tests + tipos**

```bash
npm test -- tests/lib/session.test.ts
npx tsc --noEmit
```
Expected: PASS y sin errores de tipos.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(auth): sesión en cookie, middleware por rol y login"
```

---

## Task 10: Admin — empresas (crear y listar)

**Files:**
- Create: `src/app/(admin)/layout.tsx`, `src/app/(admin)/empresas/page.tsx`, `src/app/(admin)/empresas/actions.ts`
- Test: `tests/domain/empresas.test.ts`

**Interfaces:**
- Consumes: tabla `empresas`, `db`.
- Produces: `crearEmpresa(formData)` server action; helper `listarEmpresas(db)`.

- [ ] **Step 1: Test del helper** — `tests/domain/empresas.test.ts`

```ts
import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { empresas } from "@/db/schema";
import { listarEmpresas } from "@/domain/empresasQuery";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("listarEmpresas", () => {
  it("devuelve empresas ordenadas por nombre", async () => {
    const t = await createTestDb(); close = t.close;
    await t.db.insert(empresas).values([{ nombre: "Zeta", prefijo: "Z" }, { nombre: "Alfa", prefijo: "A" }]);
    const filas = await listarEmpresas(t.db);
    expect(filas.map((e) => e.nombre)).toEqual(["Alfa", "Zeta"]);
  });
});
```

- [ ] **Step 2: Verificar que falla** → FAIL.

- [ ] **Step 3: Implementar query** — `src/domain/empresasQuery.ts`

```ts
import type { DrizzleDb } from "@/db/client";
import { empresas } from "@/db/schema";

export function listarEmpresas(db: DrizzleDb) {
  return db.select().from(empresas).orderBy(empresas.nombre);
}
```

- [ ] **Step 4: Correr test** → PASS.

- [ ] **Step 5: Layout admin con navegación** — `src/app/(admin)/layout.tsx`

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await getCurrentUser();
  if (!u || u.rol !== "admin") redirect("/login");
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <nav className="flex gap-4 p-4 border-b border-neutral-800 text-sm">
        <Link href="/reportes">Reportes</Link>
        <Link href="/empresas">Empresas</Link>
        <Link href="/lotes">Lotes</Link>
        <Link href="/usuarios">Usuarios</Link>
      </nav>
      <main className="p-4 max-w-5xl mx-auto">{children}</main>
    </div>
  );
}
```

- [ ] **Step 6: Action + página de empresas** — `src/app/(admin)/empresas/actions.ts`

```ts
"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { empresas } from "@/db/schema";
import { normalizarPrefijo } from "@/lib/codigo";

export async function crearEmpresa(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return;
  const prefijoRaw = String(formData.get("prefijo") ?? "").trim();
  const prefijo = normalizarPrefijo(prefijoRaw || nombre);
  await db.insert(empresas).values({
    nombre,
    prefijo,
    contacto: String(formData.get("contacto") ?? "") || null,
    notas: String(formData.get("notas") ?? "") || null,
  }).onConflictDoNothing();
  revalidatePath("/empresas");
}
```

`src/app/(admin)/empresas/page.tsx`:
```tsx
import { db } from "@/db/client";
import { listarEmpresas } from "@/domain/empresasQuery";
import { crearEmpresa } from "./actions";

export default async function EmpresasPage() {
  const filas = await listarEmpresas(db);
  return (
    <section className="space-y-6">
      <h1 className="text-lg font-bold">Empresas (clientes)</h1>
      <form action={crearEmpresa} className="flex flex-wrap gap-2">
        <input name="nombre" placeholder="Nombre" required className="p-2 rounded bg-neutral-800" />
        <input name="prefijo" placeholder="Prefijo (ej. MOK)" maxLength={6} className="p-2 rounded bg-neutral-800 w-40" />
        <input name="contacto" placeholder="Contacto" className="p-2 rounded bg-neutral-800" />
        <button className="px-4 rounded bg-red-600">Agregar</button>
      </form>
      <p className="text-xs text-neutral-500">Si dejas el prefijo vacío se genera de las iniciales del nombre. El código queda como M{"{"}prefijo{"}"}-XXXXXX.</p>
      <ul className="divide-y divide-neutral-800">
        {filas.map((e) => (
          <li key={e.id} className="py-2">{e.nombre} <span className="font-mono text-red-400 text-sm">M{e.prefijo}-</span> <span className="text-neutral-400 text-sm">{e.contacto}</span></li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 7: Tipos + commit**

```bash
npx tsc --noEmit
git add -A && git commit -m "feat(admin): CRUD de empresas"
```

---

## Task 11: Admin — crear lote y listar lotes

**Files:**
- Create: `src/app/(admin)/lotes/page.tsx`, `src/app/(admin)/lotes/actions.ts`, `src/domain/lotesQuery.ts`
- Test: `tests/domain/lotesQuery.test.ts`

**Interfaces:**
- Consumes: `generarLote` (Task 5), `getCurrentUser`, tablas `lotes`, `empresas`, `boletos`.
- Produces: `crearLoteAction(formData)` server action; `listarLotes(db)` con conteos.

- [ ] **Step 1: Test** — `tests/domain/lotesQuery.test.ts`

```ts
import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { empresas } from "@/db/schema";
import { generarLote } from "@/domain/boletos";
import { listarLotes } from "@/domain/lotesQuery";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("listarLotes", () => {
  it("lista lotes con nombre de empresa y cantidad", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Pepsi", prefijo: "PEP" }).returning();
    await generarLote(t.db, { empresaId: emp.id, descripcion: "Agosto", cantidad: 3, fechaVencimiento: "2026-12-31" });
    const filas = await listarLotes(t.db);
    expect(filas[0]).toMatchObject({ empresa: "Pepsi", descripcion: "Agosto", cantidad: 3 });
  });
});
```

- [ ] **Step 2: Verificar que falla** → FAIL.

- [ ] **Step 3: Implementar query** — `src/domain/lotesQuery.ts`

```ts
import { eq, desc } from "drizzle-orm";
import type { DrizzleDb } from "@/db/client";
import { lotes, empresas } from "@/db/schema";

export function listarLotes(db: DrizzleDb) {
  return db
    .select({
      id: lotes.id, empresa: empresas.nombre, descripcion: lotes.descripcion,
      cantidad: lotes.cantidad, fechaVencimiento: lotes.fechaVencimiento, creadoEn: lotes.creadoEn,
    })
    .from(lotes)
    .innerJoin(empresas, eq(lotes.empresaId, empresas.id))
    .orderBy(desc(lotes.creadoEn));
}
```

- [ ] **Step 4: Correr test** → PASS.

- [ ] **Step 5: Action** — `src/app/(admin)/lotes/actions.ts`

```ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { generarLote } from "@/domain/boletos";
import { getCurrentUser } from "@/lib/session";

export async function crearLoteAction(formData: FormData) {
  const u = await getCurrentUser();
  if (!u || u.rol !== "admin") redirect("/login");
  const { loteId } = await generarLote(db, {
    empresaId: Number(formData.get("empresaId")),
    descripcion: String(formData.get("descripcion") ?? "").trim(),
    cantidad: Number(formData.get("cantidad")),
    fechaVencimiento: String(formData.get("fechaVencimiento")),
    creadoPor: u.userId,
  });
  revalidatePath("/lotes");
  redirect(`/lotes/${loteId}/imprimir`);
}
```

- [ ] **Step 6: Página** — `src/app/(admin)/lotes/page.tsx`

```tsx
import Link from "next/link";
import { db } from "@/db/client";
import { listarEmpresas } from "@/domain/empresasQuery";
import { listarLotes } from "@/domain/lotesQuery";
import { crearLoteAction } from "./actions";

export default async function LotesPage() {
  const [empresas, lotes] = await Promise.all([listarEmpresas(db), listarLotes(db)]);
  return (
    <section className="space-y-6">
      <h1 className="text-lg font-bold">Lotes de boletos</h1>
      <form action={crearLoteAction} className="grid sm:grid-cols-5 gap-2">
        <select name="empresaId" required className="p-2 rounded bg-neutral-800">
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <input name="descripcion" placeholder="Descripción" required className="p-2 rounded bg-neutral-800" />
        <input name="cantidad" type="number" min="1" placeholder="Cantidad" required className="p-2 rounded bg-neutral-800" />
        <input name="fechaVencimiento" type="date" required className="p-2 rounded bg-neutral-800" />
        <button className="px-4 rounded bg-red-600">Generar</button>
      </form>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-neutral-400"><th>Empresa</th><th>Descripción</th><th>Cant.</th><th>Vence</th><th></th></tr></thead>
        <tbody>
          {lotes.map((l) => (
            <tr key={l.id} className="border-t border-neutral-800">
              <td>{l.empresa}</td><td>{l.descripcion}</td><td>{l.cantidad}</td><td>{l.fechaVencimiento}</td>
              <td><Link className="text-red-400" href={`/lotes/${l.id}/imprimir`}>Imprimir QR</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 7: Tipos + commit**

```bash
npx tsc --noEmit
git add -A && git commit -m "feat(admin): crear y listar lotes"
```

---

## Task 12: Generación de QR + página imprimible + endpoint PNG

**Files:**
- Create: `src/app/api/qr/[token]/route.ts`, `src/app/(admin)/lotes/[id]/imprimir/page.tsx`, `src/domain/boletosQuery.ts`
- Test: `tests/domain/boletosQuery.test.ts`

**Interfaces:**
- Consumes: tabla `boletos`, `qrcode`, `NEXT_PUBLIC_APP_URL`.
- Produces:
  - `GET /api/qr/:token` → PNG del QR que codifica `${NEXT_PUBLIC_APP_URL}/canje/:token`.
  - `boletosDeLote(db, loteId)` → `{ codigo, token }[]`.
  - Página imprimible: grilla de QR con su código, lista para `Ctrl+P → Guardar PDF`.

- [ ] **Step 1: Test del query** — `tests/domain/boletosQuery.test.ts`

```ts
import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { empresas } from "@/db/schema";
import { generarLote } from "@/domain/boletos";
import { boletosDeLote } from "@/domain/boletosQuery";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("boletosDeLote", () => {
  it("trae código y token de cada boleto del lote", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "X", prefijo: "X" }).returning();
    const lote = await generarLote(t.db, { empresaId: emp.id, descripcion: "L", cantidad: 3, fechaVencimiento: "2026-12-31" });
    const filas = await boletosDeLote(t.db, lote.loteId);
    expect(filas).toHaveLength(3);
    expect(filas[0]).toHaveProperty("codigo");
    expect(filas[0]).toHaveProperty("token");
  });
});
```

- [ ] **Step 2: Verificar que falla** → FAIL.

- [ ] **Step 3: Implementar query** — `src/domain/boletosQuery.ts`

```ts
import { eq } from "drizzle-orm";
import type { DrizzleDb } from "@/db/client";
import { boletos } from "@/db/schema";

export function boletosDeLote(db: DrizzleDb, loteId: number) {
  return db.select({ codigo: boletos.codigo, token: boletos.token })
    .from(boletos).where(eq(boletos.loteId, loteId)).orderBy(boletos.id);
}
```

- [ ] **Step 4: Correr test** → PASS.

- [ ] **Step 5: Endpoint PNG del QR** — `src/app/api/qr/[token]/route.ts`

```ts
import QRCode from "qrcode";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/canje/${token}`;
  const png = await QRCode.toBuffer(url, { width: 320, margin: 1 });
  return new Response(png, {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
```

- [ ] **Step 6: Página imprimible** — `src/app/(admin)/lotes/[id]/imprimir/page.tsx`

```tsx
import { db } from "@/db/client";
import { boletosDeLote } from "@/domain/boletosQuery";

export default async function ImprimirPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const filas = await boletosDeLote(db, Number(id));
  return (
    <div className="bg-white text-black p-4">
      <p className="print:hidden mb-4 text-sm">Usa <b>Ctrl/Cmd + P</b> para guardar como PDF e imprimir.</p>
      <div className="grid grid-cols-3 gap-4">
        {filas.map((b) => (
          <div key={b.token} className="border rounded p-3 flex flex-col items-center break-inside-avoid">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qr/${b.token}`} alt={b.codigo} width={160} height={160} />
            <span className="mt-2 font-mono text-sm">{b.codigo}</span>
            <span className="text-xs text-neutral-500">Metrocinemas</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Tipos + commit**

```bash
npx tsc --noEmit
git add -A && git commit -m "feat(qr): endpoint PNG y página imprimible de lote"
```

---

## Task 13: Taquilla — escáner y flujo de canje

**Files:**
- Create: `src/app/taquilla/page.tsx`, `src/components/Scanner.tsx`, `src/app/canje/[token]/page.tsx`, `src/app/canje/[token]/actions.ts`, `src/app/(admin)/logout/route.ts`
- Test: `tests/domain/canjear.test.ts` ya cubre la lógica; aquí se agrega verificación E2E manual.

**Interfaces:**
- Consumes: `obtenerBoletoPorToken`, `canjearBoleto` (Task 6), `getCurrentUser`, `html5-qrcode`.
- Produces: pantalla de escaneo que navega a `/canje/:token`; pantalla de canje con resultado y formulario portador; `confirmarCanje(formData)` action.

- [ ] **Step 1: Componente escáner (cliente)** — `src/components/Scanner.tsx`

```tsx
"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";

export default function Scanner() {
  const router = useRouter();
  const ref = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode("reader");
    ref.current = scanner;
    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      (texto) => {
        // El QR contiene la URL .../canje/<token>; extraemos el token.
        const token = texto.split("/canje/")[1]?.split(/[/?#]/)[0];
        if (token) { scanner.stop().catch(() => {}); router.push(`/canje/${token}`); }
      },
      () => {},
    ).catch(() => {});
    return () => { scanner.stop().catch(() => {}); };
  }, [router]);

  return <div id="reader" className="w-full max-w-sm mx-auto" />;
}
```

- [ ] **Step 2: Página taquilla** — `src/app/taquilla/page.tsx`

```tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import Scanner from "@/components/Scanner";

export default async function TaquillaPage() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return (
    <main className="min-h-screen bg-neutral-950 text-white p-4 space-y-4">
      <h1 className="text-lg font-bold text-center">Escanear boleto</h1>
      <Scanner />
      <p className="text-center text-neutral-400 text-sm">Apunta la cámara al código QR.</p>
    </main>
  );
}
```

- [ ] **Step 3: Action de canje** — `src/app/canje/[token]/actions.ts`

```ts
"use server";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { canjearBoleto } from "@/domain/boletos";
import { getCurrentUser } from "@/lib/session";

export async function confirmarCanje(token: string, _prev: unknown, formData: FormData) {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  if (!u.sedeId) return { error: "Tu usuario no tiene sede asignada." };

  const r = await canjearBoleto(db, token, {
    sedeId: u.sedeId,
    usuarioId: u.userId,
    portadorNombre: String(formData.get("portadorNombre") ?? "").trim(),
    portadorDni: String(formData.get("portadorDni") ?? "").trim(),
  });
  if (!r.ok) {
    const msg = { invalido: "Boleto inválido o falso", canjeado: "Este boleto ya fue canjeado",
      anulado: "Boleto anulado", vencido: "Boleto vencido" }[r.razon];
    return { error: msg };
  }
  return { ok: true, codigo: r.codigo };
}
```

- [ ] **Step 4: Página de canje** — `src/app/canje/[token]/page.tsx`

```tsx
import { db } from "@/db/client";
import { obtenerBoletoPorToken } from "@/domain/boletos";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import FormularioCanje from "./FormularioCanje";

export default async function CanjePage({ params }: { params: Promise<{ token: string }> }) {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  const { token } = await params;
  const r = await obtenerBoletoPorToken(db, token);

  if (!r.ok) {
    const msg = { invalido: "Boleto inválido o falso", canjeado: "Ya fue canjeado", anulado: "Boleto anulado", vencido: "Boleto vencido" }[r.razon];
    return (
      <main className="min-h-screen grid place-items-center bg-red-900 text-white p-6 text-center">
        <div><p className="text-3xl font-bold">✕ {msg}</p>
          {r.boleto?.canje?.fecha && <p className="mt-2">Canjeado en {r.boleto.canje.sede} el {new Date(r.boleto.canje.fecha).toLocaleString("es-HN")}</p>}
          <a href="/taquilla" className="inline-block mt-6 underline">Escanear otro</a></div>
      </main>
    );
  }
  return <FormularioCanje token={token} codigo={r.boleto.codigo} empresa={r.boleto.empresa} />;
}
```

`src/app/canje/[token]/FormularioCanje.tsx`:
```tsx
"use client";
import { useActionState } from "react";
import { confirmarCanje } from "./actions";

export default function FormularioCanje(
  { token, codigo, empresa }: { token: string; codigo: string; empresa: string },
) {
  const [state, action, pending] = useActionState(confirmarCanje.bind(null, token), {});
  if (state?.ok) {
    return (
      <main className="min-h-screen grid place-items-center bg-green-800 text-white p-6 text-center">
        <div><p className="text-3xl font-bold">✓ Canje exitoso</p><p className="mt-2 font-mono">{state.codigo}</p>
          <a href="/taquilla" className="inline-block mt-6 underline">Escanear otro</a></div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-neutral-950 text-white p-4">
      <div className="max-w-sm mx-auto space-y-4">
        <div className="bg-neutral-900 p-4 rounded">
          <p className="text-sm text-neutral-400">Boleto válido</p>
          <p className="font-mono text-lg">{codigo}</p>
          <p className="text-sm">Empresa: {empresa}</p>
        </div>
        <form action={action} className="space-y-3">
          <input name="portadorNombre" placeholder="Nombre del portador" required className="w-full p-3 rounded bg-neutral-800" />
          <input name="portadorDni" placeholder="DNI del portador" required className="w-full p-3 rounded bg-neutral-800" />
          {state?.error && <p className="text-red-400">{state.error}</p>}
          <button disabled={pending} className="w-full p-3 rounded bg-green-600 font-semibold disabled:opacity-50">
            {pending ? "Canjeando…" : "Confirmar canje"}
          </button>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Logout** — `src/app/(admin)/logout/route.ts`

```ts
import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

export async function GET(req: Request) {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/login", req.url));
}
```

- [ ] **Step 6: Verificación E2E manual**

Con la app corriendo (`npm run dev`) y datos sembrados:
1. Crear un lote de 2 boletos, abrir la página imprimible, escanear un QR desde `/taquilla`.
2. Completar nombre+DNI → pantalla verde. Escanear el mismo QR otra vez → pantalla roja "Ya fue canjeado".
3. Verificar en la BD que `estado='canjeado'` y los datos del portador quedaron guardados.

- [ ] **Step 7: Tipos + commit**

```bash
npx tsc --noEmit
git add -A && git commit -m "feat(taquilla): escáner y flujo de canje"
```

---

## Task 14: Admin — reportes + exportar a Excel/CSV

**Files:**
- Create: `src/app/(admin)/reportes/page.tsx`, `src/app/(admin)/reportes/exportar/route.ts`
- Test: `tests/domain/exportar.test.ts`

**Interfaces:**
- Consumes: `reportePorEmpresa`, `listarCanjes` (Task 7).
- Produces:
  - `aCsv(filas): string` (helper puro, testeable).
  - Página de reportes con tabla por empresa.
  - `GET /reportes/exportar?empresaId=&sedeId=&desde=&hasta=` → CSV descargable (compatible con Excel).

- [ ] **Step 1: Test del helper CSV** — `tests/domain/exportar.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { aCsv } from "@/domain/exportar";

describe("aCsv", () => {
  it("genera encabezado y filas, escapando comas y comillas", () => {
    const csv = aCsv([
      { codigo: "MMOK-ABC123", empresa: "Coca, Cola", sede: "DANLI", portadorNombre: 'Juan "J"', portadorDni: "0801", fecha: new Date("2026-07-16T10:00:00Z") },
    ]);
    const [head, row] = csv.trim().split("\n");
    expect(head).toBe("codigo,empresa,sede,portadorNombre,portadorDni,fecha");
    expect(row).toContain('"Coca, Cola"');
    expect(row).toContain('"Juan ""J"""');
  });
});
```

- [ ] **Step 2: Verificar que falla** → FAIL.

- [ ] **Step 3: Implementar helper** — `src/domain/exportar.ts`

```ts
type Fila = {
  codigo: string; empresa: string; sede: string | null;
  portadorNombre: string | null; portadorDni: string | null; fecha: Date | null;
};

function esc(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function aCsv(filas: Fila[]): string {
  const cols = ["codigo", "empresa", "sede", "portadorNombre", "portadorDni", "fecha"];
  const head = cols.join(",");
  const body = filas.map((f) => [
    f.codigo, f.empresa, f.sede ?? "", f.portadorNombre ?? "", f.portadorDni ?? "",
    f.fecha ? f.fecha.toISOString() : "",
  ].map((x) => esc(String(x))).join(",")).join("\n");
  return `${head}\n${body}\n`;
}
```

- [ ] **Step 4: Correr test** → PASS.

- [ ] **Step 5: Ruta de exportación** — `src/app/(admin)/reportes/exportar/route.ts`

```ts
import { db } from "@/db/client";
import { listarCanjes } from "@/domain/reportes";
import { aCsv } from "@/domain/exportar";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const num = (k: string) => (url.searchParams.get(k) ? Number(url.searchParams.get(k)) : undefined);
  const str = (k: string) => url.searchParams.get(k) ?? undefined;
  const filas = await listarCanjes(db, {
    empresaId: num("empresaId"), sedeId: num("sedeId"), desde: str("desde"), hasta: str("hasta"),
  });
  const csv = "﻿" + aCsv(filas); // BOM para que Excel abra en UTF-8
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="canjes.csv"`,
    },
  });
}
```

- [ ] **Step 6: Página de reportes** — `src/app/(admin)/reportes/page.tsx`

```tsx
import Link from "next/link";
import { db } from "@/db/client";
import { reportePorEmpresa } from "@/domain/reportes";

export default async function ReportesPage() {
  const rep = await reportePorEmpresa(db);
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Reportes</h1>
        <Link href="/logout" className="text-sm text-neutral-400">Cerrar sesión</Link>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-neutral-400"><th>Empresa</th><th>Emitidos</th><th>Canjeados</th><th>Pendientes</th><th></th></tr></thead>
        <tbody>
          {rep.map((r) => (
            <tr key={r.empresaId} className="border-t border-neutral-800">
              <td>{r.empresa}</td><td>{r.emitidos}</td><td>{r.canjeados}</td><td>{r.pendientes}</td>
              <td><a className="text-red-400" href={`/reportes/exportar?empresaId=${r.empresaId}`}>Exportar CSV</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 7: Tipos + commit**

```bash
npx tsc --noEmit
git add -A && git commit -m "feat(admin): reportes por empresa y exportación CSV"
```

---

## Task 15: Admin — usuarios de taquilla + despliegue

**Files:**
- Create: `src/app/(admin)/usuarios/page.tsx`, `src/app/(admin)/usuarios/actions.ts`, `README.md`
- Modify: `next.config.ts` (si hace falta), `.env.example`

**Interfaces:**
- Consumes: `hashPassword`, tablas `usuarios`, `sedes`.
- Produces: alta de usuarios `taquilla` con sede; documentación de despliegue en Vercel + Neon.

- [ ] **Step 1: Action de crear usuario** — `src/app/(admin)/usuarios/actions.ts`

```ts
"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { usuarios } from "@/db/schema";
import { hashPassword } from "@/lib/auth";

export async function crearUsuario(formData: FormData) {
  const usuario = String(formData.get("usuario") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const rol = String(formData.get("rol")) === "admin" ? "admin" : "taquilla";
  const sedeId = rol === "taquilla" ? Number(formData.get("sedeId")) : null;
  if (!usuario || password.length < 6) return;
  await db.insert(usuarios).values({
    usuario, passwordHash: await hashPassword(password), rol, sedeId,
  }).onConflictDoNothing();
  revalidatePath("/usuarios");
}
```

- [ ] **Step 2: Página usuarios** — `src/app/(admin)/usuarios/page.tsx`

```tsx
import { db } from "@/db/client";
import { sedes as sedesTable, usuarios as usuariosTable } from "@/db/schema";
import { crearUsuario } from "./actions";

export default async function UsuariosPage() {
  const [sedes, usuarios] = await Promise.all([
    db.select().from(sedesTable).orderBy(sedesTable.nombre),
    db.select().from(usuariosTable).orderBy(usuariosTable.usuario),
  ]);
  return (
    <section className="space-y-6">
      <h1 className="text-lg font-bold">Usuarios</h1>
      <form action={crearUsuario} className="grid sm:grid-cols-5 gap-2">
        <input name="usuario" placeholder="Usuario" required className="p-2 rounded bg-neutral-800" />
        <input name="password" type="password" placeholder="Contraseña (mín 6)" required className="p-2 rounded bg-neutral-800" />
        <select name="rol" className="p-2 rounded bg-neutral-800"><option value="taquilla">Taquilla</option><option value="admin">Admin</option></select>
        <select name="sedeId" className="p-2 rounded bg-neutral-800">{sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select>
        <button className="px-4 rounded bg-red-600">Crear</button>
      </form>
      <ul className="divide-y divide-neutral-800">
        {usuarios.map((u) => <li key={u.id} className="py-2">{u.usuario} — <span className="text-neutral-400">{u.rol}</span></li>)}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: README de despliegue** — `README.md`

Contenido mínimo:
```markdown
# Boletos Metrocinemas

## Desarrollo
1. `npm install`
2. Copiar `.env.example` a `.env` y completar `DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`.
3. `npm run db:migrate && npm run db:seed`
4. `npm run dev`

## Despliegue (Vercel + Neon)
1. Crear base Postgres en Vercel Marketplace (Neon). Copiar `DATABASE_URL`.
2. En el proyecto Vercel, definir variables: `DATABASE_URL`, `SESSION_SECRET` (aleatorio ≥32 chars), `NEXT_PUBLIC_APP_URL` (dominio de producción).
3. `npm run db:migrate` (una vez) contra la BD de producción.
4. `ADMIN_USER=... ADMIN_PASS=... npm run db:seed` una sola vez para crear sedes y admin.
5. Desplegar (push a la rama conectada o `vercel deploy --prod`).

## Roles
- **admin**: genera lotes, imprime QR, ve reportes, crea usuarios.
- **taquilla**: escanea y canjea (sede fijada por su cuenta).
```

- [ ] **Step 4: Verificación final**

```bash
npm test
npx tsc --noEmit
npm run build
```
Expected: todos los tests PASS, sin errores de tipos, build de producción exitoso.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(admin): gestión de usuarios + docs de despliegue"
```

---

## Self-Review (cobertura del spec)

- Generar códigos y QR únicos → Tasks 3, 5, 12. ✔
- Autocompletar datos al escanear + captura manual nombre/DNI → Task 13. ✔
- Canje único / anti-duplicidad atómica → Task 6 (test de doble canje). ✔
- Detección de QR falso y vencimiento → Task 6. ✔
- Lotes por empresa + reporte por cliente → Tasks 5, 7, 11, 14. ✔
- Válido en cualquier sede; sede tomada del usuario de taquilla → Tasks 9, 13. ✔
- Roles admin/taquilla con login usuario/contraseña por sede → Tasks 4, 9, 15. ✔
- Exportar a Excel/CSV → Task 14. ✔
- Hospedaje Vercel + Neon → Tasks 2, 8, 15. ✔
- Fuera de alcance (auto-servicio empresa, película específica, pagos) → no se implementa. ✔

Criterios de éxito del spec cubiertos por tests automáticos (Tasks 3, 5, 6, 7, 14) y verificación E2E manual (Tasks 8, 13).
