# Configuración (Usuarios + Sedes + Zona horaria) — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agrupar la administración en una sección **Configuración** (reemplaza "Usuarios" en el menú) con landing de botones-tarjeta, agregar CRUD de **Sedes** (crear/editar/activar/desactivar) y hacer la **zona horaria** ajustable desde la app, con modales bien adaptados a móvil.

**Architecture:** Se sigue el patrón existente: página server (carga vía `src/domain/*Query.ts`) → panel cliente con `useTransition` + `Modal` → server action (`actions.ts`, valida `puedeAdmin`) → dominio puro (`src/domain/*`, recibe `DrizzleDb`). Dos cambios de esquema aditivos (`sedes.activo`, tabla `configuracion`). La zona horaria configurada se lee de la BD y se inyecta en la lógica de fechas (que se mantiene pura recibiendo `hoy`/`tz` como dato).

**Tech Stack:** Next.js 16 (App Router, TS) · Drizzle ORM · Neon Postgres (neon-http) / PGlite (tests) · Vitest · Tailwind v4 · Merlin.

## Global Constraints

- UI en español; tema Merlin (tokens CSS: `var(--black-60)`, `var(--error-150)`, etc.).
- Server actions validan permiso admin: `const u = await getCurrentUser(); if (!u?.puedeAdmin) redirect("/login");`.
- `drizzle-orm/neon-http` NO soporta `db.transaction()`; usar upsert de una sola sentencia o compensación manual donde aplique.
- Migraciones aditivas generadas con `npm run db:generate`; se aplican en el deploy con `npm run db:migrate` (no correr migrate en las tareas). El helper `src/test/db.ts` debe reflejar cada cambio de esquema.
- Fecha de negocio por defecto `America/Tegucigalpa`; tras la fase 3 se usa la zona configurada.
- Tests: Vitest con `createTestDb()` de `src/test/db.ts` (`let close; afterEach(() => close?.())`). Full suite: `npm test` (= `vitest run`; es lento en Windows por PGlite `fileParallelism:false`). Focalizado: `npx vitest run <archivo>`.
- Windows: Bash (Git Bash) y PowerShell disponibles; si `npm`/`npx` no están en el PATH de Bash, usar PowerShell (node en `C:/Program Files/nodejs`). Si `npm run build` da EPERM por OneDrive sobre `.next`, borrar `.next` y reintentar.
- Verificación antes de cada commit de código: `npx tsc --noEmit` + `npm run build` (+ `npm test` cuando la tarea toca dominio/tests).
- Autodeploy: push a `master` con autor `appjeffhn@gmail.com`. No hacer push salvo que el usuario lo pida.

---

## FASE 1 — Shell de Configuración + mover Usuarios + Modal responsivo

### Task 1: Prop `size` en Modal (responsivo)

**Files:**
- Modify: `src/components/ui/Modal.tsx`
- Modify: `src/app/(admin)/lotes/LotesPanel.tsx` (usar `size="lg"` en el modal de productos)

**Interfaces:**
- Produces: `Modal` acepta `size?: "md" | "lg"` (default `"md"`).

- [ ] **Step 1: Ampliar el componente Modal**

Reemplazar el contenido de `src/components/ui/Modal.tsx` por:

```tsx
"use client";
import type { ReactNode } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "md" | "lg";
}) {
  if (!open) return null;
  const maxW = size === "lg" ? "max-w-2xl" : "max-w-md";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(9,20,46,0.45)" }}
      onClick={onClose}
    >
      <div
        className={`card w-full ${maxW} max-h-[90vh] overflow-y-auto p-5 sm:p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="text-xl font-semibold mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Usar `size="lg"` en el modal de productos del lote**

En `src/app/(admin)/lotes/LotesPanel.tsx`, en el `<Modal open={editandoProd !== null} ...>` (el titulado "Productos del lote"), agregar `size="lg"`:

```tsx
      <Modal open={editandoProd !== null} onClose={() => setEditandoProd(null)} title="Productos del lote" size="lg">
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit` (Expected: sin errores) y `npm run build` (Expected: build exitoso).

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/Modal.tsx "src/app/(admin)/lotes/LotesPanel.tsx"
git commit -m "feat(ui): Modal con tamaño configurable (md/lg) para formularios grandes"
```

---

### Task 2: Shell de Configuración + mover Usuarios + nav + middleware

**Files:**
- Create: `src/app/(admin)/configuracion/page.tsx`
- Move: `src/app/(admin)/usuarios/page.tsx` → `src/app/(admin)/configuracion/usuarios/page.tsx`
- Move: `src/app/(admin)/usuarios/UsuariosPanel.tsx` → `src/app/(admin)/configuracion/usuarios/UsuariosPanel.tsx`
- Move: `src/app/(admin)/usuarios/actions.ts` → `src/app/(admin)/configuracion/usuarios/actions.ts`
- Modify: `src/components/AppNav.tsx`
- Modify: `src/middleware.ts`

**Interfaces:**
- Produces: ruta `/configuracion` (landing) y `/configuracion/usuarios`; ítem de nav "Configuración".

- [ ] **Step 1: Mover la carpeta de usuarios**

```bash
cd "C:/Users/IT/OneDrive/Aplicaciones/Boletos-Metrocinemas"
mkdir -p "src/app/(admin)/configuracion"
git mv "src/app/(admin)/usuarios" "src/app/(admin)/configuracion/usuarios"
```

- [ ] **Step 2: Actualizar `revalidatePath` en las acciones de usuarios**

En `src/app/(admin)/configuracion/usuarios/actions.ts`, reemplazar las tres apariciones de `revalidatePath("/usuarios")` por `revalidatePath("/configuracion/usuarios")`.

- [ ] **Step 3: Crear la landing de Configuración**

Crear `src/app/(admin)/configuracion/page.tsx`:

```tsx
import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function ConfiguracionPage() {
  const items = [
    { href: "/configuracion/usuarios", title: "Usuarios", desc: "Crear, editar y activar/desactivar usuarios y sus accesos." },
    { href: "/configuracion/sedes", title: "Sedes", desc: "Administrar sedes/sucursales: crear, editar y activar/desactivar." },
    { href: "/configuracion/zona-horaria", title: "Zona horaria", desc: "Ajustar la zona horaria de la aplicación." },
  ];
  return (
    <section className="space-y-6">
      <h1 className="text-[28px] leading-8">Configuración</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className="block">
            <Card className="h-full hover:border-[var(--blue-hover)] transition-colors">
              <h2 className="text-base font-semibold">{it.title}</h2>
              <p className="text-sm text-[var(--black-60)] mt-1">{it.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Agregar un enlace "Volver a configuración" y título en la página de usuarios**

En `src/app/(admin)/configuracion/usuarios/page.tsx`, agregar el import `import Link from "next/link";` y, dentro del `<section>`, antes del `<h1>`, insertar:

```tsx
      <Link href="/configuracion" className="text-sm font-semibold text-[var(--blue-hover)] hover:underline">
        ← Volver a configuración
      </Link>
```

- [ ] **Step 5: Actualizar la navegación**

En `src/components/AppNav.tsx`, en el arreglo `NAV`, reemplazar `{ href: "/usuarios", label: "Usuarios" }` por `{ href: "/configuracion", label: "Configuración" }`.

- [ ] **Step 6: Actualizar el middleware**

En `src/middleware.ts`:
- En `ADMIN_PREFIXES`, cambiar `"/usuarios"` por `"/configuracion"`.
- En `config.matcher`, cambiar `"/usuarios/:path*"` por `"/configuracion/:path*"`.

- [ ] **Step 7: Verificar**

Run: `npx tsc --noEmit` (Expected: sin errores) y `npm run build` (Expected: build exitoso; aparecen `/configuracion` y `/configuracion/usuarios`, y ya NO `/usuarios`).

- [ ] **Step 8: Commit**

```bash
git add -A "src/app/(admin)/configuracion" src/components/AppNav.tsx src/middleware.ts
git commit -m "feat(configuracion): shell con landing + mover Usuarios a /configuracion/usuarios"
```

---

## FASE 2 — Sedes/Sucursales CRUD

### Task 3: Esquema `sedes.activo` + migración

**Files:**
- Modify: `src/db/schema.ts`
- Modify: `src/test/db.ts`
- Create: `drizzle/0003_*.sql` (generado)
- Test: `tests/db/schema-sedes.test.ts`

**Interfaces:**
- Produces: `sedes.activo boolean notNull default true`.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/db/schema-sedes.test.ts`:

```ts
import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { sedes } from "@/db/schema";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("schema sedes.activo", () => {
  it("una sede nueva queda activa por defecto", async () => {
    const t = await createTestDb(); close = t.close;
    const [s] = await t.db.insert(sedes).values({ nombre: "NOVACENTRO" }).returning();
    expect(s.activo).toBe(true);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run tests/db/schema-sedes.test.ts`
Expected: FAIL — `activo` no existe en `sedes` (error de tipo/propiedad).

- [ ] **Step 3: Agregar la columna al schema**

En `src/db/schema.ts`, cambiar la tabla `sedes` a:

```ts
export const sedes = pgTable("sedes", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull().unique(),
  activo: boolean("activo").notNull().default(true),
});
```

(`boolean` ya está importado en este archivo.)

- [ ] **Step 4: Reflejarlo en el helper de tests**

En `src/test/db.ts`, cambiar el `CREATE TABLE sedes` por:

```ts
  await db.execute(sql`
    CREATE TABLE sedes (id serial PRIMARY KEY, nombre text NOT NULL UNIQUE,
      activo boolean NOT NULL DEFAULT true)`);
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npx vitest run tests/db/schema-sedes.test.ts`
Expected: PASS.

- [ ] **Step 6: Generar la migración**

Run: `npm run db:generate`
Expected: nuevo `drizzle/0003_*.sql` con `ALTER TABLE "sedes" ADD COLUMN "activo" boolean DEFAULT true NOT NULL;` (no correr `db:migrate`).

- [ ] **Step 7: Verificar y commit**

Run: `npx tsc --noEmit` y `npm test` (Expected: todo verde).

```bash
git add src/db/schema.ts src/test/db.ts tests/db/schema-sedes.test.ts drizzle/
git commit -m "feat(schema): sedes.activo + migracion"
```

---

### Task 4: Dominio de sedes (+ helper de error único compartido)

**Files:**
- Create: `src/lib/dbErrors.ts`
- Modify: `src/domain/productos.ts` (usar el helper compartido)
- Create: `src/domain/sedesQuery.ts`
- Create: `src/domain/sedes.ts`
- Test: `tests/domain/sedes.test.ts`

**Interfaces:**
- Consumes: tabla `sedes` con `activo` (Task 3).
- Produces:
  - `src/lib/dbErrors.ts`: `esViolacionUnica(err: unknown): boolean`.
  - `src/domain/sedesQuery.ts`: `type SedeAdmin = { id: number; nombre: string; activo: boolean }`; `listarSedes(db): Promise<SedeAdmin[]>` (todas, orden por nombre); `sedesActivas(db): Promise<{ id: number; nombre: string }[]>` (solo `activo=true`, orden por nombre).
  - `src/domain/sedes.ts`: `crearSede(db, nombre: string): Promise<{ id: number } | { error: string }>`; `editarSede(db, id: number, nombre: string): Promise<{ ok: true } | { error: string }>`; `toggleSedeActiva(db, id: number): Promise<{ ok: true }>`.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/domain/sedes.test.ts`:

```ts
import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { listarSedes, sedesActivas } from "@/domain/sedesQuery";
import { crearSede, editarSede, toggleSedeActiva } from "@/domain/sedes";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("dominio de sedes", () => {
  it("crea y lista sedes ordenadas", async () => {
    const t = await createTestDb(); close = t.close;
    await crearSede(t.db, "MEGAMALL");
    await crearSede(t.db, "DANLI");
    const todas = await listarSedes(t.db);
    expect(todas.map((s) => s.nombre)).toEqual(["DANLI", "MEGAMALL"]);
    expect(todas[0].activo).toBe(true);
  });

  it("rechaza nombre duplicado y vacío", async () => {
    const t = await createTestDb(); close = t.close;
    await crearSede(t.db, "MEGAMALL");
    expect(await crearSede(t.db, "MEGAMALL")).toEqual({ error: "Ya existe una sede con ese nombre." });
    expect(await crearSede(t.db, "   ")).toEqual({ error: "El nombre es obligatorio." });
  });

  it("edita el nombre de una sede", async () => {
    const t = await createTestDb(); close = t.close;
    const c = await crearSede(t.db, "PLAZA");
    if ("error" in c) throw new Error(c.error);
    expect(await editarSede(t.db, c.id, "PLAZA AMERICA")).toEqual({ ok: true });
    const [s] = await listarSedes(t.db);
    expect(s.nombre).toBe("PLAZA AMERICA");
  });

  it("toggleSedeActiva alterna y sedesActivas excluye inactivas", async () => {
    const t = await createTestDb(); close = t.close;
    const a = await crearSede(t.db, "MEGAMALL");
    await crearSede(t.db, "DANLI");
    if ("error" in a) throw new Error(a.error);
    await toggleSedeActiva(t.db, a.id);
    const activas = await sedesActivas(t.db);
    expect(activas.map((s) => s.nombre)).toEqual(["DANLI"]);
    expect(await listarSedes(t.db)).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run tests/domain/sedes.test.ts`
Expected: FAIL — módulos `@/domain/sedesQuery` y `@/domain/sedes` no existen.

- [ ] **Step 3: Crear el helper de error único compartido**

Crear `src/lib/dbErrors.ts`:

```ts
/** true si el error es una violación de restricción única de Postgres (SQLSTATE 23505). */
export function esViolacionUnica(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string }; message?: string };
  return e?.code === "23505"
    || e?.cause?.code === "23505"
    || /duplicate key|unique constraint/i.test(e?.message ?? "");
}
```

- [ ] **Step 4: Reusar el helper en productos.ts**

En `src/domain/productos.ts`, eliminar la función local `esViolacionUnica` y agregar el import `import { esViolacionUnica } from "@/lib/dbErrors";`. (No cambia el comportamiento; `tests/domain/productos.test.ts` sigue verde.)

- [ ] **Step 5: Crear las queries de sedes**

Crear `src/domain/sedesQuery.ts`:

```ts
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
```

- [ ] **Step 6: Crear las mutaciones de sedes**

Crear `src/domain/sedes.ts`:

```ts
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
```

- [ ] **Step 7: Correr el test y verificar que pasa**

Run: `npx vitest run tests/domain/sedes.test.ts` (Expected: PASS, 4 tests) y `npx vitest run tests/domain/productos.test.ts` (Expected: sigue PASS).

- [ ] **Step 8: Verificar y commit**

Run: `npx tsc --noEmit` y `npm test` (Expected: todo verde).

```bash
git add src/lib/dbErrors.ts src/domain/productos.ts src/domain/sedesQuery.ts src/domain/sedes.ts tests/domain/sedes.test.ts
git commit -m "feat(domain): sedes (crear/editar/activar) + helper esViolacionUnica compartido"
```

---

### Task 5: UI de Sedes (`/configuracion/sedes`)

**Files:**
- Create: `src/app/(admin)/configuracion/sedes/page.tsx`
- Create: `src/app/(admin)/configuracion/sedes/actions.ts`
- Create: `src/app/(admin)/configuracion/sedes/SedesPanel.tsx`

**Interfaces:**
- Consumes: `listarSedes`/`SedeAdmin` (Task 4), `crearSede`/`editarSede`/`toggleSedeActiva` (Task 4).

- [ ] **Step 1: Crear las server actions**

Crear `src/app/(admin)/configuracion/sedes/actions.ts`:

```ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { crearSede, editarSede, toggleSedeActiva } from "@/domain/sedes";
import { getCurrentUser } from "@/lib/session";

export type SedeActionResult = { error?: string } | void;

export async function crearSedeAction(formData: FormData): Promise<SedeActionResult> {
  const u = await getCurrentUser();
  if (!u?.puedeAdmin) redirect("/login");
  const r = await crearSede(db, String(formData.get("nombre") ?? ""));
  if ("error" in r) return { error: r.error };
  revalidatePath("/configuracion/sedes");
}

export async function editarSedeAction(formData: FormData): Promise<SedeActionResult> {
  const u = await getCurrentUser();
  if (!u?.puedeAdmin) redirect("/login");
  const id = Number(formData.get("id"));
  if (!id) return { error: "Sede inválida." };
  const r = await editarSede(db, id, String(formData.get("nombre") ?? ""));
  if ("error" in r) return { error: r.error };
  revalidatePath("/configuracion/sedes");
}

export async function toggleSedeActivaAction(formData: FormData): Promise<SedeActionResult> {
  const u = await getCurrentUser();
  if (!u?.puedeAdmin) redirect("/login");
  const id = Number(formData.get("id"));
  if (!id) return { error: "Sede inválida." };
  await toggleSedeActiva(db, id);
  revalidatePath("/configuracion/sedes");
}
```

- [ ] **Step 2: Crear el panel cliente**

Crear `src/app/(admin)/configuracion/sedes/SedesPanel.tsx`:

```tsx
"use client";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Th, Td } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import type { SedeAdmin } from "@/domain/sedesQuery";
import { crearSedeAction, editarSedeAction, toggleSedeActivaAction, type SedeActionResult } from "./actions";

export function SedesPanel({ sedes }: { sedes: SedeAdmin[] }) {
  const [crearError, setCrearError] = useState<string | null>(null);
  const [crearKey, setCrearKey] = useState(0);
  const [editando, setEditando] = useState<SedeAdmin | null>(null);
  const [editarError, setEditarError] = useState<string | null>(null);
  const [alternando, setAlternando] = useState<SedeAdmin | null>(null);
  const [pending, startTransition] = useTransition();

  function onCrear(formData: FormData) {
    setCrearError(null);
    startTransition(async () => {
      const r: SedeActionResult = await crearSedeAction(formData);
      if (r?.error) { setCrearError(r.error); return; }
      setCrearKey((k) => k + 1);
    });
  }

  function onEditar(formData: FormData) {
    setEditarError(null);
    startTransition(async () => {
      const r: SedeActionResult = await editarSedeAction(formData);
      if (r?.error) { setEditarError(r.error); return; }
      setEditando(null);
    });
  }

  function onAlternar(formData: FormData) {
    startTransition(async () => {
      await toggleSedeActivaAction(formData);
      setAlternando(null);
    });
  }

  return (
    <>
      <Card>
        <h2 className="text-base font-semibold mb-4">Nueva sede</h2>
        <form key={crearKey} action={onCrear} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[12rem]">
            <Input label="Nombre" name="nombre" placeholder="ej. NOVACENTRO" required />
          </div>
          <Button type="submit" variant="primary" disabled={pending}>Agregar</Button>
        </form>
        {crearError && <p className="mt-2 text-sm text-[var(--error-150)]">{crearError}</p>}
      </Card>

      <Table>
        <thead>
          <tr><Th>Nombre</Th><Th>Estado</Th><Th>Acciones</Th></tr>
        </thead>
        <tbody>
          {sedes.length === 0 && (
            <tr><Td colSpan={3} className="text-center text-[var(--black-60)]">Aún no hay sedes.</Td></tr>
          )}
          {sedes.map((s) => (
            <tr key={s.id}>
              <Td className="font-semibold">{s.nombre}</Td>
              <Td>{s.activo ? <Badge tone="success">Activa</Badge> : <Badge tone="neutral">Inactiva</Badge>}</Td>
              <Td>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" className="text-xs px-3 py-1.5"
                    onClick={() => { setEditarError(null); setEditando(s); }}>Editar</Button>
                  <Button type="button" variant={s.activo ? "danger" : "secondary"} className="text-xs px-3 py-1.5"
                    onClick={() => setAlternando(s)}>{s.activo ? "Desactivar" : "Activar"}</Button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal open={editando !== null} onClose={() => setEditando(null)} title="Editar sede">
        {editando && (
          <form key={editando.id} action={onEditar} className="space-y-3">
            <input type="hidden" name="id" value={editando.id} />
            <Input label="Nombre" name="nombre" defaultValue={editando.nombre} required />
            {editarError && <p className="text-sm text-[var(--error-150)]">{editarError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditando(null)} disabled={pending}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={alternando !== null} onClose={() => setAlternando(null)} title={alternando?.activo ? "Desactivar sede" : "Activar sede"}>
        {alternando && (
          <form action={onAlternar} className="space-y-3">
            <input type="hidden" name="id" value={alternando.id} />
            <p className="text-sm">
              {alternando.activo
                ? <>¿Desactivar <strong>{alternando.nombre}</strong>? No aparecerá al asignar sedes a lotes/usuarios ni en taquilla; los datos históricos se conservan.</>
                : <>¿Activar <strong>{alternando.nombre}</strong>? Volverá a estar disponible para asignaciones.</>}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setAlternando(null)} disabled={pending}>Cancelar</Button>
              <Button type="submit" variant={alternando.activo ? "danger" : "primary"} disabled={pending}>
                {pending ? "Guardando…" : alternando.activo ? "Desactivar" : "Activar"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
```

- [ ] **Step 3: Crear la página server**

Crear `src/app/(admin)/configuracion/sedes/page.tsx`:

```tsx
import Link from "next/link";
import { db } from "@/db/client";
import { listarSedes } from "@/domain/sedesQuery";
import { SedesPanel } from "./SedesPanel";

export default async function SedesPage() {
  const sedes = await listarSedes(db);
  return (
    <section className="space-y-6">
      <Link href="/configuracion" className="text-sm font-semibold text-[var(--blue-hover)] hover:underline">
        ← Volver a configuración
      </Link>
      <h1 className="text-[28px] leading-8">Sedes</h1>
      <SedesPanel sedes={sedes} />
    </section>
  );
}
```

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit` (Expected: sin errores) y `npm run build` (Expected: build exitoso; ruta `/configuracion/sedes` presente).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(admin)/configuracion/sedes"
git commit -m "feat(configuracion): pantalla CRUD de sedes con activar/desactivar"
```

---

### Task 6: Ocultar sedes inactivas en los selectores

**Files:**
- Modify: `src/app/(admin)/lotes/page.tsx`
- Modify: `src/app/(admin)/configuracion/usuarios/page.tsx`
- Modify: `src/app/elegir-sede/page.tsx`

**Interfaces:**
- Consumes: `sedesActivas` (Task 4).

- [ ] **Step 1: Lotes — usar solo sedes activas en el selector**

En `src/app/(admin)/lotes/page.tsx`, reemplazar la carga de sedes por `sedesActivas`. Cambiar el import de sedes y la línea del `Promise.all`:

- Agregar import: `import { sedesActivas } from "@/domain/sedesQuery";`
- Quitar (si queda sin uso) el import de `sedes as sedesTable` y su `db.select(...)`; en el `Promise.all`, la entrada de sedes pasa a `sedesActivas(db)`.

Resultado del `Promise.all` (mantener el resto igual):

```tsx
  const [empresas, lotes, sedes, catalogo] = await Promise.all([
    listarEmpresas(db),
    listarLotes(db),
    sedesActivas(db),
    listarProductos(db),
  ]);
```

- [ ] **Step 2: Usuarios — usar solo sedes activas en el selector**

En `src/app/(admin)/configuracion/usuarios/page.tsx`, reemplazar la carga de sedes por `sedesActivas`:

- Agregar import: `import { sedesActivas } from "@/domain/sedesQuery";`
- Quitar el import `sedes as sedesTable` y su `db.select(...)`; en el `Promise.all`, la entrada de sedes pasa a `sedesActivas(db)`:

```tsx
  const [sedes, usuarios] = await Promise.all([
    sedesActivas(db),
    listarUsuarios(db),
  ]);
```

- [ ] **Step 3: elegir-sede — filtrar a activas y manejar vacío**

En `src/app/elegir-sede/page.tsx`:
- Cambiar el import `import { inArray } from "drizzle-orm";` por `import { and, eq, inArray } from "drizzle-orm";`.
- Cambiar la consulta a:

```tsx
  const listaSedes = await db
    .select()
    .from(sedes)
    .where(and(inArray(sedes.id, u.sedeIds), eq(sedes.activo, true)))
    .orderBy(sedes.nombre);
```

- Dentro del `<div className="grid gap-3">`, manejar el caso vacío agregando antes del `.map`:

```tsx
          {listaSedes.length === 0 && (
            <p className="text-sm text-center" style={{ color: "var(--black-60)" }}>
              No tienes sedes activas asignadas. Contacta a un administrador.
            </p>
          )}
```

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit` (Expected: sin errores) y `npm run build` (Expected: build exitoso).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(admin)/lotes/page.tsx" "src/app/(admin)/configuracion/usuarios/page.tsx" "src/app/elegir-sede/page.tsx"
git commit -m "feat(sedes): mostrar solo sedes activas en selectores de lote/usuario/taquilla"
```

---

## FASE 3 — Zona horaria configurable

### Task 7: Tabla `configuracion` + dominio + lista de zonas

**Files:**
- Modify: `src/db/schema.ts`
- Modify: `src/test/db.ts`
- Create: `drizzle/0004_*.sql` (generado)
- Create: `src/lib/zonasHorarias.ts`
- Create: `src/domain/configuracion.ts`
- Test: `tests/domain/configuracion.test.ts`

**Interfaces:**
- Produces:
  - tabla `configuracion` (fila única `id=1`).
  - `src/lib/zonasHorarias.ts`: `ZONAS_HORARIAS: { id: string; label: string }[]`; `ZONA_DEFAULT = "America/Tegucigalpa"`; `esZonaValida(tz: string): boolean`.
  - `src/domain/configuracion.ts`: `zonaHoraria(db): Promise<string>`; `guardarZonaHoraria(db, tz: string): Promise<{ ok: true } | { error: string }>`.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/domain/configuracion.test.ts`:

```ts
import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { zonaHoraria, guardarZonaHoraria } from "@/domain/configuracion";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("configuracion / zona horaria", () => {
  it("devuelve el default cuando no hay fila", async () => {
    const t = await createTestDb(); close = t.close;
    expect(await zonaHoraria(t.db)).toBe("America/Tegucigalpa");
  });

  it("guarda y lee una zona válida (upsert)", async () => {
    const t = await createTestDb(); close = t.close;
    expect(await guardarZonaHoraria(t.db, "America/Mexico_City")).toEqual({ ok: true });
    expect(await zonaHoraria(t.db)).toBe("America/Mexico_City");
    // segundo guardado actualiza la misma fila
    expect(await guardarZonaHoraria(t.db, "America/Guatemala")).toEqual({ ok: true });
    expect(await zonaHoraria(t.db)).toBe("America/Guatemala");
  });

  it("rechaza una zona fuera de la lista permitida", async () => {
    const t = await createTestDb(); close = t.close;
    expect(await guardarZonaHoraria(t.db, "Marte/Olympus")).toEqual({ error: "Zona horaria no válida." });
    expect(await zonaHoraria(t.db)).toBe("America/Tegucigalpa");
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run tests/domain/configuracion.test.ts`
Expected: FAIL — `@/domain/configuracion` no existe (y la tabla tampoco).

- [ ] **Step 3: Agregar la tabla al schema**

En `src/db/schema.ts`, al final, agregar:

```ts
export const configuracion = pgTable("configuracion", {
  id: integer("id").primaryKey(),
  zonaHoraria: text("zona_horaria").notNull().default("America/Tegucigalpa"),
  actualizadoEn: timestamp("actualizado_en").notNull().defaultNow(),
});
```

(`integer`, `text`, `timestamp` ya están importados.)

- [ ] **Step 4: Reflejarlo en el helper de tests**

En `src/test/db.ts`, dentro de `crearEsquema`, agregar:

```ts
  await db.execute(sql`
    CREATE TABLE configuracion (
      id integer PRIMARY KEY,
      zona_horaria text NOT NULL DEFAULT 'America/Tegucigalpa',
      actualizado_en timestamp NOT NULL DEFAULT now())`);
```

- [ ] **Step 5: Crear la lista de zonas**

Crear `src/lib/zonasHorarias.ts`:

```ts
export const ZONA_DEFAULT = "America/Tegucigalpa";

export const ZONAS_HORARIAS: { id: string; label: string }[] = [
  { id: "America/Tegucigalpa", label: "Tegucigalpa (UTC-6)" },
  { id: "America/Guatemala", label: "Guatemala (UTC-6)" },
  { id: "America/El_Salvador", label: "El Salvador (UTC-6)" },
  { id: "America/Managua", label: "Managua (UTC-6)" },
  { id: "America/Costa_Rica", label: "Costa Rica (UTC-6)" },
  { id: "America/Mexico_City", label: "Ciudad de México (UTC-6)" },
  { id: "America/Panama", label: "Panamá (UTC-5)" },
  { id: "America/Bogota", label: "Bogotá (UTC-5)" },
  { id: "America/New_York", label: "Nueva York (UTC-5/-4)" },
  { id: "America/Los_Angeles", label: "Los Ángeles (UTC-8/-7)" },
  { id: "UTC", label: "UTC" },
];

const IDS = new Set(ZONAS_HORARIAS.map((z) => z.id));

export function esZonaValida(tz: string): boolean {
  return IDS.has(tz);
}
```

- [ ] **Step 6: Crear el dominio de configuración**

Crear `src/domain/configuracion.ts`:

```ts
import { eq } from "drizzle-orm";
import type { DrizzleDb } from "@/db/client";
import { configuracion } from "@/db/schema";
import { ZONA_DEFAULT, esZonaValida } from "@/lib/zonasHorarias";

export async function zonaHoraria(db: DrizzleDb): Promise<string> {
  const [row] = await db
    .select({ zonaHoraria: configuracion.zonaHoraria })
    .from(configuracion)
    .where(eq(configuracion.id, 1));
  return row?.zonaHoraria ?? ZONA_DEFAULT;
}

export async function guardarZonaHoraria(
  db: DrizzleDb,
  tz: string,
): Promise<{ ok: true } | { error: string }> {
  if (!esZonaValida(tz)) return { error: "Zona horaria no válida." };
  await db
    .insert(configuracion)
    .values({ id: 1, zonaHoraria: tz })
    .onConflictDoUpdate({ target: configuracion.id, set: { zonaHoraria: tz, actualizadoEn: new Date() } });
  return { ok: true };
}
```

- [ ] **Step 7: Correr el test y verificar que pasa**

Run: `npx vitest run tests/domain/configuracion.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 8: Generar la migración**

Run: `npm run db:generate`
Expected: nuevo `drizzle/0004_*.sql` con `CREATE TABLE "configuracion" (...)` (no correr `db:migrate`).

- [ ] **Step 9: Verificar y commit**

Run: `npx tsc --noEmit` y `npm test` (Expected: todo verde).

```bash
git add src/db/schema.ts src/test/db.ts src/lib/zonasHorarias.ts src/domain/configuracion.ts tests/domain/configuracion.test.ts drizzle/
git commit -m "feat(configuracion): tabla configuracion + dominio de zona horaria + lista de zonas"
```

---

### Task 8: Aplicar la zona configurada en la lógica de fechas

**Files:**
- Create: `src/lib/fechas.ts`
- Test: `tests/lib/fechas.test.ts`
- Modify: `src/domain/boletos.ts`
- Modify: `src/domain/dashboard.ts`
- Modify: `src/app/canje/[token]/page.tsx`
- Modify: `src/app/canje/[token]/actions.ts`
- Modify: `src/app/taquilla/multiple/actions.ts`

**Interfaces:**
- Consumes: `zonaHoraria` (Task 7).
- Produces: `src/lib/fechas.ts`: `hoyISOEn(tz: string): string`; `fechaISOEn(fecha: Date, tz: string): string`.

- [ ] **Step 1: Escribir el test de las utilidades de fecha (falla)**

Crear `tests/lib/fechas.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { hoyISOEn, fechaISOEn } from "@/lib/fechas";

describe("fechas por zona horaria", () => {
  it("fechaISOEn ubica la fecha calendario según la zona", () => {
    // 2026-01-01T03:00:00Z: en UTC es día 1; en Tegucigalpa (UTC-6) aún es 2025-12-31 21:00.
    const d = new Date("2026-01-01T03:00:00Z");
    expect(fechaISOEn(d, "UTC")).toBe("2026-01-01");
    expect(fechaISOEn(d, "America/Tegucigalpa")).toBe("2025-12-31");
  });

  it("hoyISOEn devuelve formato YYYY-MM-DD", () => {
    expect(hoyISOEn("America/Tegucigalpa")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run tests/lib/fechas.test.ts`
Expected: FAIL — `@/lib/fechas` no existe.

- [ ] **Step 3: Crear las utilidades de fecha**

Crear `src/lib/fechas.ts`:

```ts
/** Fecha calendario (YYYY-MM-DD) de una fecha dada, en la zona horaria indicada. */
export function fechaISOEn(fecha: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(fecha);
}

/** Fecha calendario de "hoy" (YYYY-MM-DD) en la zona horaria indicada. */
export function hoyISOEn(tz: string): string {
  return fechaISOEn(new Date(), tz);
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run tests/lib/fechas.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Refactorizar `boletos.ts` para usar el helper**

En `src/domain/boletos.ts`:
- Agregar los imports: `import { hoyISOEn } from "@/lib/fechas";` y `import { ZONA_DEFAULT } from "@/lib/zonasHorarias";`.
- Eliminar la función local `hoyISO()` (líneas del helper con `Intl.DateTimeFormat(... "America/Tegucigalpa" ...)`).
- Reemplazar los tres defaults `hoy = hoyISO()` por `hoy = hoyISOEn(ZONA_DEFAULT)` en `obtenerBoletoPorToken`, `canjearBoleto` y `canjearMultiple`.

(El `ZONA_DEFAULT` es solo el fallback; los llamadores pasarán la zona configurada.)

- [ ] **Step 6: Refactorizar `dashboard.ts` para usar la zona configurada**

En `src/domain/dashboard.ts`:
- Agregar imports: `import { hoyISOEn, fechaISOEn } from "@/lib/fechas";` y `import { zonaHoraria } from "@/domain/configuracion";`.
- Eliminar las funciones locales `hoyISO()` y `fechaISOTegucigalpa()`.
- En `dashboardKpis`, al inicio, obtener la zona: `const tz = await zonaHoraria(db);`.
- Reemplazar `const hoy = hoyISO();` por `const hoy = hoyISOEn(tz);`.
- Reemplazar `fechaISOTegucigalpa(r.fecha)` por `fechaISOEn(r.fecha, tz)`.

- [ ] **Step 7: Pasar la zona configurada desde los llamadores de canje**

En `src/app/canje/[token]/page.tsx`:
- Agregar imports: `import { hoyISOEn } from "@/lib/fechas";` y `import { zonaHoraria } from "@/domain/configuracion";`.
- Cambiar `const r = await obtenerBoletoPorToken(db, token);` por:

```tsx
  const hoy = hoyISOEn(await zonaHoraria(db));
  const r = await obtenerBoletoPorToken(db, token, hoy);
```

En `src/app/canje/[token]/actions.ts` (acción `confirmarCanje`):
- Agregar imports: `import { hoyISOEn } from "@/lib/fechas";` y `import { zonaHoraria } from "@/domain/configuracion";`.
- Donde llama a `canjearBoleto(db, token, datos)`, pasar `hoy`: computar `const hoy = hoyISOEn(await zonaHoraria(db));` antes y llamar `canjearBoleto(db, token, datos, hoy)`.

En `src/app/taquilla/multiple/actions.ts`:
- Agregar imports: `import { hoyISOEn } from "@/lib/fechas";` y `import { zonaHoraria } from "@/domain/configuracion";`.
- En `infoBoleto`, computar `const hoy = hoyISOEn(await zonaHoraria(db));` y llamar `obtenerBoletoPorToken(db, token, hoy)`.
- En `confirmarCanjeMultiple`, computar `const hoy = hoyISOEn(await zonaHoraria(db));` y llamar `canjearMultiple(db, unicos, { ... }, hoy)`.

- [ ] **Step 8: Verificar y commit**

Run: `npx vitest run tests/lib/fechas.test.ts` (PASS), `npx tsc --noEmit` (sin errores), `npm run build` (exitoso) y `npm test` (todo verde — los tests de canje/vencimiento existentes siguen pasando porque inyectan `hoy`).

```bash
git add src/lib/fechas.ts tests/lib/fechas.test.ts src/domain/boletos.ts src/domain/dashboard.ts "src/app/canje/[token]/page.tsx" "src/app/canje/[token]/actions.ts" "src/app/taquilla/multiple/actions.ts"
git commit -m "feat(fechas): aplicar la zona horaria configurada en canje/vencimiento/dashboard"
```

---

### Task 9: UI de Zona horaria (`/configuracion/zona-horaria`)

**Files:**
- Create: `src/app/(admin)/configuracion/zona-horaria/page.tsx`
- Create: `src/app/(admin)/configuracion/zona-horaria/actions.ts`

**Interfaces:**
- Consumes: `zonaHoraria`/`guardarZonaHoraria` (Task 7), `ZONAS_HORARIAS` (Task 7).

- [ ] **Step 1: Crear la server action**

Crear `src/app/(admin)/configuracion/zona-horaria/actions.ts`:

```ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { guardarZonaHoraria } from "@/domain/configuracion";
import { getCurrentUser } from "@/lib/session";

export type ZonaActionResult = { error?: string; ok?: boolean };

export async function guardarZonaAction(_prev: ZonaActionResult, formData: FormData): Promise<ZonaActionResult> {
  const u = await getCurrentUser();
  if (!u?.puedeAdmin) redirect("/login");
  const tz = String(formData.get("zonaHoraria") ?? "");
  const r = await guardarZonaHoraria(db, tz);
  if ("error" in r) return { error: r.error };
  revalidatePath("/configuracion/zona-horaria");
  revalidatePath("/dashboard");
  return { ok: true };
}
```

- [ ] **Step 2: Crear la página con el formulario**

Crear `src/app/(admin)/configuracion/zona-horaria/page.tsx`. La página server carga la zona actual y renderiza un formulario cliente inline (client component en el mismo archivo) con `useActionState`:

```tsx
import Link from "next/link";
import { db } from "@/db/client";
import { zonaHoraria } from "@/domain/configuracion";
import { ZONAS_HORARIAS } from "@/lib/zonasHorarias";
import { ZonaForm } from "./ZonaForm";

export default async function ZonaHorariaPage() {
  const actual = await zonaHoraria(db);
  return (
    <section className="space-y-6">
      <Link href="/configuracion" className="text-sm font-semibold text-[var(--blue-hover)] hover:underline">
        ← Volver a configuración
      </Link>
      <h1 className="text-[28px] leading-8">Zona horaria</h1>
      <ZonaForm actual={actual} zonas={ZONAS_HORARIAS} />
    </section>
  );
}
```

- [ ] **Step 3: Crear el formulario cliente**

Crear `src/app/(admin)/configuracion/zona-horaria/ZonaForm.tsx`:

```tsx
"use client";
import { useActionState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { guardarZonaAction, type ZonaActionResult } from "./actions";

export function ZonaForm({ actual, zonas }: { actual: string; zonas: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState<ZonaActionResult, FormData>(guardarZonaAction, {});
  return (
    <Card className="max-w-md space-y-4">
      <p className="text-sm text-[var(--black-60)]">
        Determina la fecha de vencimiento de los boletos y el cálculo de “hoy” en los reportes.
      </p>
      <form action={action} className="space-y-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Zona horaria</span>
          <select name="zonaHoraria" defaultValue={actual} className="input">
            {zonas.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
          </select>
        </label>
        {state?.error && <p className="text-sm text-[var(--error-150)]">{state.error}</p>}
        {state?.ok && <p className="text-sm" style={{ color: "var(--success-150)" }}>Zona horaria guardada.</p>}
        <Button type="submit" variant="primary" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</Button>
      </form>
    </Card>
  );
}
```

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit` (Expected: sin errores) y `npm run build` (Expected: build exitoso; ruta `/configuracion/zona-horaria` presente).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(admin)/configuracion/zona-horaria"
git commit -m "feat(configuracion): pantalla para elegir la zona horaria"
```

---

## Verificación final

- [ ] **Suite completa:** `npm test` (todo verde, incluidos los tests existentes).
- [ ] **Tipos + build:** `npx tsc --noEmit` y `npm run build` sin errores; rutas `/configuracion`, `/configuracion/usuarios`, `/configuracion/sedes`, `/configuracion/zona-horaria` presentes y `/usuarios` ausente.
- [ ] **Migraciones presentes:** `drizzle/0003_*.sql` (sedes.activo) y `drizzle/0004_*.sql` (configuracion). Aplicar con `npm run db:migrate` en el deploy.

## Self-Review (cobertura del spec)

- Zona horaria ajustable + mostrada en Configuración → Task 7 (dominio + lista), Task 8 (aplicación), Task 9 (UI). ✔
- Usuarios pasa a Configuración → Task 2. ✔
- Ver/crear/editar sedes con botones estilo reportes + activar/desactivar → Task 3 (schema), Task 4 (dominio), Task 5 (UI), Task 6 (ocultar inactivas). ✔
- Modales bien adaptados → Task 1 (prop `size` + max-h/scroll existentes). ✔
- Empresas se queda aparte (no se mueve) → no hay tarea que la toque. ✔
