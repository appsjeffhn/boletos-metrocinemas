# Productos en lotes + totalizado en taquilla + reporte de items — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir definir productos (nombre, detalle, precio, cantidad por boleto) por lote desde un catálogo reutilizable, mostrarlos en taquilla al canjear (con totalizado en escaneo múltiple, sin precios), y ofrecer un reporte detallado de items creados/canjeados/pendientes con importes.

**Architecture:** Se agregan dos tablas: `productos` (catálogo administrable) y `lote_productos` (copia de nombre/detalle/precio del catálogo al momento de armar el lote + cantidad por boleto). El modelo es *bundle*: cada boleto del lote vale por todos los productos del lote. La lógica vive en funciones puras de `src/domain/*` (recibiendo `DrizzleDb`, testeables con PGlite); las páginas server cargan datos vía queries y delegan mutaciones a server actions en `actions.ts` que validan permisos con `getCurrentUser()`. La edición de productos de un lote se bloquea si el lote ya tiene canjes; como `lote_productos` es una copia, el reporte histórico nunca se distorsiona.

**Tech Stack:** Next.js 16 (App Router, TS) · Drizzle ORM · Neon Postgres (neon-http) / PGlite (tests) · Vitest · Tailwind v4 · Merlin design system.

## Global Constraints

- UI en español; tema Merlin (tokens CSS en `globals.css` / `merlin-design-system.md`, ej. `var(--black-60)`, `var(--error-150)`).
- **`drizzle-orm/neon-http` NO soporta `db.transaction()`**: para inserts multi-tabla atómicos usar rollback compensatorio manual (ver `generarLote` en `src/domain/boletos.ts`).
- **Taquilla nunca muestra precios/importes** (ni validación individual ni totalizado múltiple). Precios solo en administración (catálogo, crear/editar lote) y reporte.
- **Editar productos de un lote se bloquea si el lote tiene canjes** (usar `loteTieneCanjes`).
- Editar productos **no** regenera ni invalida los QR (el QR solo lleva el token).
- Fecha "hoy"/vencimiento en `America/Tegucigalpa` (helper `hoyISO()` ya existe en `src/domain/boletos.ts`).
- `numeric(10,2)` de Drizzle se maneja como `string | null` en JS; al calcular montos parsear con `Number(...)`, tratando `null` como 0.
- Moneda: Lempiras (formato `L.` + monto).
- Tests con Vitest, helper `createTestDb()` de `src/test/db.ts` (patrón `let close; afterEach(() => close?.())`). Correr con `npm test`.
- Permisos: `puedeAdmin` para catálogo/lotes/reportes; `puedeTaquilla` para taquilla.
- Verificación antes de cada commit de código: `npx tsc --noEmit` + `npm run build` + `npm test`.
- Autodeploy: push a `master` con git author `appjeffhn@gmail.com`. **No** hacer push salvo que el usuario lo pida; sí commits locales.

---

## Task 1: Schema de `productos` y `lote_productos` + migración + test db

**Files:**
- Modify: `src/db/schema.ts`
- Modify: `src/test/db.ts`
- Create: `drizzle/0002_*.sql` (generado por drizzle-kit)
- Test: `tests/db/schema-productos.test.ts`

**Interfaces:**
- Produces (tablas Drizzle exportadas): `productos` (columnas `id`, `nombre`, `detalle`, `precio`, `activo`, `creadoEn`) y `loteProductos` (columnas `id`, `loteId`, `productoId`, `nombre`, `detalle`, `precioUnitario`, `cantidadPorBoleto`, `orden`, `creadoEn`).

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/db/schema-productos.test.ts`:

```ts
import { describe, it, expect, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/test/db";
import { empresas, lotes, productos, loteProductos } from "@/db/schema";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("schema productos / lote_productos", () => {
  it("inserta un producto de catálogo con precio y activo por defecto", async () => {
    const t = await createTestDb(); close = t.close;
    const [p] = await t.db.insert(productos)
      .values({ nombre: "Entrada 3D", detalle: "Sala normal", precio: "120.00" })
      .returning();
    expect(p.nombre).toBe("Entrada 3D");
    expect(p.detalle).toBe("Sala normal");
    expect(Number(p.precio)).toBe(120);
    expect(p.activo).toBe(true);
  });

  it("inserta lote_productos copiando datos y con cantidadPorBoleto/orden por defecto", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Coca-Cola", prefijo: "CC" }).returning();
    const [lote] = await t.db.insert(lotes)
      .values({ empresaId: emp.id, descripcion: "L", cantidad: 10, fechaVencimiento: "2026-12-31" })
      .returning();
    const [lp] = await t.db.insert(loteProductos)
      .values({ loteId: lote.id, nombre: "Entrada 3D", precioUnitario: "100.00", cantidadPorBoleto: 2 })
      .returning();
    expect(lp.loteId).toBe(lote.id);
    expect(lp.productoId).toBeNull();
    expect(lp.cantidadPorBoleto).toBe(2);
    expect(lp.orden).toBe(0);
    const filas = await t.db.select().from(loteProductos).where(eq(loteProductos.loteId, lote.id));
    expect(filas).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run tests/db/schema-productos.test.ts`
Expected: FAIL — `productos`/`loteProductos` no existen en `@/db/schema` (error de import/compilación).

- [ ] **Step 3: Agregar las tablas al schema**

En `src/db/schema.ts`, agregar `numeric` al import de `drizzle-orm/pg-core` (la primera línea de imports) para que quede:

```ts
import {
  pgTable, pgEnum, serial, text, integer, numeric, timestamp, date, boolean, uniqueIndex, index, primaryKey,
} from "drizzle-orm/pg-core";
```

Y al final del archivo agregar:

```ts
export const productos = pgTable("productos", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull().unique(),
  detalle: text("detalle"),
  precio: numeric("precio", { precision: 10, scale: 2 }),
  activo: boolean("activo").notNull().default(true),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const loteProductos = pgTable("lote_productos", {
  id: serial("id").primaryKey(),
  loteId: integer("lote_id").notNull().references(() => lotes.id),
  productoId: integer("producto_id").references(() => productos.id),
  nombre: text("nombre").notNull(),
  detalle: text("detalle"),
  precioUnitario: numeric("precio_unitario", { precision: 10, scale: 2 }),
  cantidadPorBoleto: integer("cantidad_por_boleto").notNull().default(1),
  orden: integer("orden").notNull().default(0),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
}, (t) => ({
  loteIdx: index("lote_productos_lote_idx").on(t.loteId),
  productoIdx: index("lote_productos_producto_idx").on(t.productoId),
}));
```

- [ ] **Step 4: Reflejar las tablas en el helper de tests**

En `src/test/db.ts`, dentro de `crearEsquema`, después del bloque `CREATE TABLE lote_sedes (...)`, agregar:

```ts
  await db.execute(sql`
    CREATE TABLE productos (
      id serial PRIMARY KEY, nombre text NOT NULL UNIQUE, detalle text,
      precio numeric(10,2), activo boolean NOT NULL DEFAULT true,
      creado_en timestamp NOT NULL DEFAULT now())`);
  await db.execute(sql`
    CREATE TABLE lote_productos (
      id serial PRIMARY KEY, lote_id integer NOT NULL REFERENCES lotes(id),
      producto_id integer REFERENCES productos(id),
      nombre text NOT NULL, detalle text, precio_unitario numeric(10,2),
      cantidad_por_boleto integer NOT NULL DEFAULT 1, orden integer NOT NULL DEFAULT 0,
      creado_en timestamp NOT NULL DEFAULT now())`);
  await db.execute(sql`CREATE INDEX lote_productos_lote_idx ON lote_productos(lote_id)`);
  await db.execute(sql`CREATE INDEX lote_productos_producto_idx ON lote_productos(producto_id)`);
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npx vitest run tests/db/schema-productos.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Generar la migración**

Run: `npm run db:generate`
Expected: se crea un archivo nuevo `drizzle/0002_<nombre>.sql` con `CREATE TABLE "productos"` y `CREATE TABLE "lote_productos"`. (No correr `db:migrate` — la migración a prod se aplica en el despliegue.)

- [ ] **Step 7: Verificación y commit**

Run: `npx tsc --noEmit` (Expected: sin errores) y `npm test` (Expected: toda la suite pasa).

```bash
git add src/db/schema.ts src/test/db.ts tests/db/schema-productos.test.ts drizzle/
git commit -m "feat(schema): tablas productos y lote_productos + migracion"
```

---

## Task 2: Catálogo de productos — dominio (queries + mutaciones)

**Files:**
- Create: `src/domain/productosQuery.ts`
- Create: `src/domain/productos.ts`
- Test: `tests/domain/productos.test.ts`

**Interfaces:**
- Consumes: tabla `productos` (Task 1).
- Produces:
  - `type ProductoCatalogo = { id: number; nombre: string; detalle: string | null; precio: string | null; activo: boolean }`
  - `listarProductos(db: DrizzleDb): Promise<ProductoCatalogo[]>` (ordenado por nombre)
  - `nombresProductos(db: DrizzleDb): Promise<string[]>` (nombres de productos activos, ordenados — para autocompletar)
  - `crearProducto(db, input: { nombre: string; detalle?: string | null; precio?: string | null }): Promise<{ id: number } | { error: string }>`
  - `editarProducto(db, id: number, input: { nombre: string; detalle?: string | null; precio?: string | null; activo?: boolean }): Promise<{ ok: true } | { error: string }>`
  - `desactivarProducto(db, id: number): Promise<{ ok: true }>`

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/domain/productos.test.ts`:

```ts
import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { listarProductos, nombresProductos } from "@/domain/productosQuery";
import { crearProducto, editarProducto, desactivarProducto } from "@/domain/productos";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("catálogo de productos", () => {
  it("crea y lista productos ordenados por nombre", async () => {
    const t = await createTestDb(); close = t.close;
    await crearProducto(t.db, { nombre: "Entrada 3D", precio: "120.00" });
    await crearProducto(t.db, { nombre: "Combo palomitas", detalle: "grande", precio: "90" });
    const lista = await listarProductos(t.db);
    expect(lista.map((p) => p.nombre)).toEqual(["Combo palomitas", "Entrada 3D"]);
    expect(lista[0].detalle).toBe("grande");
  });

  it("rechaza nombre duplicado", async () => {
    const t = await createTestDb(); close = t.close;
    await crearProducto(t.db, { nombre: "Entrada 3D" });
    const r = await crearProducto(t.db, { nombre: "Entrada 3D" });
    expect(r).toEqual({ error: "Ya existe un producto con ese nombre." });
  });

  it("rechaza nombre vacío", async () => {
    const t = await createTestDb(); close = t.close;
    const r = await crearProducto(t.db, { nombre: "   " });
    expect(r).toEqual({ error: "El nombre es obligatorio." });
  });

  it("edita un producto", async () => {
    const t = await createTestDb(); close = t.close;
    const c = await crearProducto(t.db, { nombre: "Entrada 2D", precio: "80" });
    if ("error" in c) throw new Error(c.error);
    const r = await editarProducto(t.db, c.id, { nombre: "Entrada 2D", precio: "85" });
    expect(r).toEqual({ ok: true });
    const [p] = await listarProductos(t.db);
    expect(Number(p.precio)).toBe(85);
  });

  it("nombresProductos solo devuelve activos", async () => {
    const t = await createTestDb(); close = t.close;
    const a = await crearProducto(t.db, { nombre: "Entrada 3D" });
    await crearProducto(t.db, { nombre: "Combo" });
    if ("error" in a) throw new Error(a.error);
    await desactivarProducto(t.db, a.id);
    const nombres = await nombresProductos(t.db);
    expect(nombres).toEqual(["Combo"]);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run tests/domain/productos.test.ts`
Expected: FAIL — módulos `@/domain/productosQuery` y `@/domain/productos` no existen.

- [ ] **Step 3: Implementar las queries**

Crear `src/domain/productosQuery.ts`:

```ts
import { asc, eq } from "drizzle-orm";
import type { DrizzleDb } from "@/db/client";
import { productos } from "@/db/schema";

export type ProductoCatalogo = {
  id: number; nombre: string; detalle: string | null; precio: string | null; activo: boolean;
};

export async function listarProductos(db: DrizzleDb): Promise<ProductoCatalogo[]> {
  return db
    .select({
      id: productos.id, nombre: productos.nombre, detalle: productos.detalle,
      precio: productos.precio, activo: productos.activo,
    })
    .from(productos)
    .orderBy(asc(productos.nombre));
}

export async function nombresProductos(db: DrizzleDb): Promise<string[]> {
  const filas = await db
    .select({ nombre: productos.nombre })
    .from(productos)
    .where(eq(productos.activo, true))
    .orderBy(asc(productos.nombre));
  return filas.map((f) => f.nombre);
}
```

- [ ] **Step 4: Implementar las mutaciones**

Crear `src/domain/productos.ts`:

```ts
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
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npx vitest run tests/domain/productos.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Verificación y commit**

Run: `npx tsc --noEmit`
Expected: sin errores.

```bash
git add src/domain/productosQuery.ts src/domain/productos.ts tests/domain/productos.test.ts
git commit -m "feat(domain): catalogo de productos (queries y mutaciones)"
```

---

## Task 3: Catálogo de productos — UI (página CRUD + navegación)

**Files:**
- Create: `src/app/(admin)/productos/page.tsx`
- Create: `src/app/(admin)/productos/actions.ts`
- Create: `src/app/(admin)/productos/ProductosPanel.tsx`
- Modify: `src/components/AppNav.tsx`

**Interfaces:**
- Consumes: `listarProductos` (Task 2), `crearProducto`/`editarProducto`/`desactivarProducto` (Task 2), `ProductoCatalogo` (Task 2).
- Produces: ruta `/productos` (admin) y enlace de navegación.

- [ ] **Step 1: Crear las server actions**

Crear `src/app/(admin)/productos/actions.ts`:

```ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { crearProducto, editarProducto, desactivarProducto } from "@/domain/productos";
import { getCurrentUser } from "@/lib/session";

export type ProductoActionResult = { error?: string } | void;

export async function crearProductoAction(formData: FormData): Promise<ProductoActionResult> {
  const u = await getCurrentUser();
  if (!u?.puedeAdmin) redirect("/login");
  const nombre = String(formData.get("nombre") ?? "");
  const detalle = String(formData.get("detalle") ?? "");
  const precio = String(formData.get("precio") ?? "");
  const r = await crearProducto(db, { nombre, detalle, precio });
  if ("error" in r) return { error: r.error };
  revalidatePath("/productos");
}

export async function editarProductoAction(formData: FormData): Promise<ProductoActionResult> {
  const u = await getCurrentUser();
  if (!u?.puedeAdmin) redirect("/login");
  const id = Number(formData.get("id"));
  if (!id) return { error: "Producto inválido." };
  const nombre = String(formData.get("nombre") ?? "");
  const detalle = String(formData.get("detalle") ?? "");
  const precio = String(formData.get("precio") ?? "");
  const activo = formData.get("activo") === "1";
  const r = await editarProducto(db, id, { nombre, detalle, precio, activo });
  if ("error" in r) return { error: r.error };
  revalidatePath("/productos");
}

export async function desactivarProductoAction(formData: FormData): Promise<ProductoActionResult> {
  const u = await getCurrentUser();
  if (!u?.puedeAdmin) redirect("/login");
  const id = Number(formData.get("id"));
  if (!id) return { error: "Producto inválido." };
  await desactivarProducto(db, id);
  revalidatePath("/productos");
}
```

- [ ] **Step 2: Crear el panel cliente**

Crear `src/app/(admin)/productos/ProductosPanel.tsx` (sigue el patrón de `LotesPanel`: `useTransition` + modal de editar):

```tsx
"use client";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Th, Td } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import type { ProductoCatalogo } from "@/domain/productosQuery";
import {
  crearProductoAction, editarProductoAction, desactivarProductoAction, type ProductoActionResult,
} from "./actions";

export function ProductosPanel({ productos }: { productos: ProductoCatalogo[] }) {
  const [crearError, setCrearError] = useState<string | null>(null);
  const [crearKey, setCrearKey] = useState(0);
  const [editando, setEditando] = useState<ProductoCatalogo | null>(null);
  const [editarError, setEditarError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onCrear(formData: FormData) {
    setCrearError(null);
    startTransition(async () => {
      const r: ProductoActionResult = await crearProductoAction(formData);
      if (r?.error) { setCrearError(r.error); return; }
      setCrearKey((k) => k + 1);
    });
  }

  function onEditar(formData: FormData) {
    setEditarError(null);
    startTransition(async () => {
      const r: ProductoActionResult = await editarProductoAction(formData);
      if (r?.error) { setEditarError(r.error); return; }
      setEditando(null);
    });
  }

  function onDesactivar(formData: FormData) {
    startTransition(async () => { await desactivarProductoAction(formData); });
  }

  return (
    <>
      <Card>
        <h2 className="text-base font-semibold mb-4">Nuevo producto</h2>
        <form key={crearKey} action={onCrear} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
          <Input label="Nombre" name="nombre" placeholder="ej. Entrada 3D" required />
          <Input label="Detalle" name="detalle" placeholder="ej. Sala normal" />
          <Input label="Precio (L)" name="precio" type="number" min="0" step="0.01" placeholder="ej. 120.00" />
          {crearError && <p className="sm:col-span-2 lg:col-span-4 text-sm text-[var(--error-150)]">{crearError}</p>}
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" variant="primary" disabled={pending}>Agregar</Button>
          </div>
        </form>
      </Card>

      <Table>
        <thead>
          <tr><Th>Nombre</Th><Th>Detalle</Th><Th>Precio</Th><Th>Estado</Th><Th>Acciones</Th></tr>
        </thead>
        <tbody>
          {productos.length === 0 && (
            <tr><Td colSpan={5} className="text-center text-[var(--black-60)]">Aún no hay productos.</Td></tr>
          )}
          {productos.map((p) => (
            <tr key={p.id}>
              <Td className="font-semibold">{p.nombre}</Td>
              <Td>{p.detalle ?? "—"}</Td>
              <Td>{p.precio == null ? "—" : `L.${Number(p.precio).toFixed(2)}`}</Td>
              <Td>{p.activo ? <Badge tone="success">Activo</Badge> : <Badge tone="neutral">Inactivo</Badge>}</Td>
              <Td>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" className="text-xs px-3 py-1.5"
                    onClick={() => { setEditarError(null); setEditando(p); }}>Editar</Button>
                  {p.activo && (
                    <form action={onDesactivar}>
                      <input type="hidden" name="id" value={p.id} />
                      <Button type="submit" variant="danger" className="text-xs px-3 py-1.5" disabled={pending}>
                        Desactivar
                      </Button>
                    </form>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal open={editando !== null} onClose={() => setEditando(null)} title="Editar producto">
        {editando && (
          <form key={editando.id} action={onEditar} className="space-y-3">
            <input type="hidden" name="id" value={editando.id} />
            <Input label="Nombre" name="nombre" defaultValue={editando.nombre} required />
            <Input label="Detalle" name="detalle" defaultValue={editando.detalle ?? ""} />
            <Input label="Precio (L)" name="precio" type="number" min="0" step="0.01"
              defaultValue={editando.precio ?? ""} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="activo" value="1" defaultChecked={editando.activo} /> Activo
            </label>
            {editarError && <p className="text-sm text-[var(--error-150)]">{editarError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditando(null)} disabled={pending}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
```

- [ ] **Step 3: Crear la página server**

Crear `src/app/(admin)/productos/page.tsx`:

```tsx
import { db } from "@/db/client";
import { listarProductos } from "@/domain/productosQuery";
import { ProductosPanel } from "./ProductosPanel";

export default async function ProductosPage() {
  const productos = await listarProductos(db);
  return (
    <section className="space-y-6">
      <h1 className="text-[28px] leading-8">Productos</h1>
      <ProductosPanel productos={productos} />
    </section>
  );
}
```

- [ ] **Step 4: Agregar el enlace de navegación**

En `src/components/AppNav.tsx`, en el arreglo `NAV`, agregar la entrada de Productos después de Lotes:

```ts
const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/reportes", label: "Reportes" },
  { href: "/empresas", label: "Empresas" },
  { href: "/lotes", label: "Lotes" },
  { href: "/productos", label: "Productos" },
  { href: "/usuarios", label: "Usuarios" },
];
```

- [ ] **Step 5: Verificación**

Run: `npx tsc --noEmit` (Expected: sin errores) y `npm run build` (Expected: build exitoso; la ruta `/productos` aparece en la salida).

- [ ] **Step 6: Commit**

```bash
git add "src/app/(admin)/productos" src/components/AppNav.tsx
git commit -m "feat(productos): pantalla admin CRUD de catalogo + nav"
```

---

## Task 4: Productos por lote — dominio (generar con productos, consultar, editar con bloqueo)

**Files:**
- Modify: `src/domain/boletos.ts`
- Create: `src/domain/loteProductosQuery.ts`
- Test: `tests/domain/lote-productos.test.ts`

**Interfaces:**
- Consumes: `loteTieneCanjes` (existente en `src/domain/boletos.ts`), tabla `loteProductos` (Task 1).
- Produces:
  - En `boletos.ts`: extiende `NuevoLote` con un campo opcional `productos?: ProductoLoteInput[]` donde
    `type ProductoLoteInput = { productoId?: number | null; nombre: string; detalle?: string | null; precioUnitario?: string | null; cantidadPorBoleto: number }`.
    `generarLote` inserta esos productos en `lote_productos` (con rollback compensatorio).
  - En `boletos.ts`: `editarProductosLote(db: DrizzleDb, loteId: number, productos: ProductoLoteInput[]): Promise<{ ok: true } | { error: string }>` — rechaza si el lote tiene canjes; reemplaza las filas de `lote_productos` del lote; **no** toca `boletos`.
  - En `loteProductosQuery.ts`:
    - `type ProductoDeLote = { id: number; productoId: number | null; nombre: string; detalle: string | null; precioUnitario: string | null; cantidadPorBoleto: number }`
    - `productosDeLote(db, loteId: number): Promise<ProductoDeLote[]>` (ordenado por `orden`, luego `id`)
    - `productosPorToken(db, token: string): Promise<{ nombre: string; detalle: string | null; cantidadPorBoleto: number }[]>` (para taquilla — sin precio)

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/domain/lote-productos.test.ts`:

```ts
import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { empresas, sedes, usuarios, boletos } from "@/db/schema";
import { generarLote, editarProductosLote, canjearBoleto } from "@/domain/boletos";
import { productosDeLote, productosPorToken } from "@/domain/loteProductosQuery";

let close: () => Promise<void>;
afterEach(() => close?.());

async function baseEmpresa(db: Awaited<ReturnType<typeof createTestDb>>["db"]) {
  const [emp] = await db.insert(empresas).values({ nombre: "Coca-Cola", prefijo: "CC" }).returning();
  return emp;
}

describe("productos por lote", () => {
  it("generarLote guarda los productos del lote", async () => {
    const t = await createTestDb(); close = t.close;
    const emp = await baseEmpresa(t.db);
    const res = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L", cantidad: 5, fechaVencimiento: "2026-12-31",
      productos: [
        { nombre: "Entrada 3D", detalle: "Sala normal", precioUnitario: "120.00", cantidadPorBoleto: 2 },
        { nombre: "Combo", precioUnitario: "90", cantidadPorBoleto: 1 },
      ],
    });
    const prods = await productosDeLote(t.db, res.loteId);
    expect(prods).toHaveLength(2);
    expect(prods[0]).toMatchObject({ nombre: "Entrada 3D", detalle: "Sala normal", cantidadPorBoleto: 2 });
    expect(Number(prods[0].precioUnitario)).toBe(120);
  });

  it("productosPorToken devuelve los productos del lote del boleto sin precio", async () => {
    const t = await createTestDb(); close = t.close;
    const emp = await baseEmpresa(t.db);
    const res = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L", cantidad: 3, fechaVencimiento: "2026-12-31",
      productos: [{ nombre: "Entrada 3D", cantidadPorBoleto: 2 }],
    });
    const prods = await productosPorToken(t.db, res.boletos[0].token);
    expect(prods).toEqual([{ nombre: "Entrada 3D", detalle: null, cantidadPorBoleto: 2 }]);
  });

  it("editarProductosLote reemplaza los productos si no hay canjes", async () => {
    const t = await createTestDb(); close = t.close;
    const emp = await baseEmpresa(t.db);
    const res = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L", cantidad: 2, fechaVencimiento: "2026-12-31",
      productos: [{ nombre: "Entrada 2D", cantidadPorBoleto: 1 }],
    });
    const r = await editarProductosLote(t.db, res.loteId, [
      { nombre: "Entrada 3D", precioUnitario: "150", cantidadPorBoleto: 1 },
    ]);
    expect(r).toEqual({ ok: true });
    const prods = await productosDeLote(t.db, res.loteId);
    expect(prods).toHaveLength(1);
    expect(prods[0].nombre).toBe("Entrada 3D");
  });

  it("editarProductosLote se bloquea si el lote tiene canjes y NO cambia los productos", async () => {
    const t = await createTestDb(); close = t.close;
    const emp = await baseEmpresa(t.db);
    const [sede] = await t.db.insert(sedes).values({ nombre: "DANLI" }).returning();
    const [u] = await t.db.insert(usuarios).values({ usuario: "t", passwordHash: "x", puedeTaquilla: true }).returning();
    const res = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L", cantidad: 2, fechaVencimiento: "2099-12-31",
      productos: [{ nombre: "Entrada 2D", cantidadPorBoleto: 1 }],
    });
    await canjearBoleto(t.db, res.boletos[0].token, { sedeId: sede.id, usuarioId: u.id, portadorNombre: "A", portadorDni: "1" });
    const r = await editarProductosLote(t.db, res.loteId, [{ nombre: "Entrada 3D", cantidadPorBoleto: 1 }]);
    expect(r).toEqual({ error: "No se puede editar productos de un lote con canjes." });
    const prods = await productosDeLote(t.db, res.loteId);
    expect(prods[0].nombre).toBe("Entrada 2D");
    // los boletos siguen intactos (no se regeneran)
    const bs = await t.db.select().from(boletos);
    expect(bs).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run tests/domain/lote-productos.test.ts`
Expected: FAIL — `editarProductosLote` y `@/domain/loteProductosQuery` no existen; `generarLote` no acepta `productos`.

- [ ] **Step 3: Extender `generarLote` y agregar `editarProductosLote`**

En `src/domain/boletos.ts`:

1. Agregar `loteProductos` al import de `@/db/schema`:

```ts
import { lotes, boletos, empresas, sedes, usuarios, loteSedes, loteProductos } from "@/db/schema";
```

2. Agregar el tipo de input (después de `NuevoLote`):

```ts
export type ProductoLoteInput = {
  productoId?: number | null;
  nombre: string;
  detalle?: string | null;
  precioUnitario?: string | null;
  cantidadPorBoleto: number;
};

function filasLoteProductos(loteId: number, productos: ProductoLoteInput[]) {
  return productos.map((p, i) => ({
    loteId,
    productoId: p.productoId ?? null,
    nombre: p.nombre.trim(),
    detalle: p.detalle?.trim() || null,
    precioUnitario: p.precioUnitario ?? null,
    cantidadPorBoleto: p.cantidadPorBoleto,
    orden: i,
  }));
}
```

3. Extender el tipo `NuevoLote` agregando el campo:

```ts
  /** Productos que aplican al lote (modelo bundle: cada boleto vale por todos). */
  productos?: ProductoLoteInput[];
```

4. Dentro de `generarLote`, después del bloque que inserta `loteSedes` (justo antes de `return { loteId: lote.id, boletos: insertados };`), agregar:

```ts
  const prods = input.productos ?? [];
  if (prods.length > 0) {
    try {
      await db.insert(loteProductos).values(filasLoteProductos(lote.id, prods));
    } catch (err) {
      // Compensación (neon-http sin transacciones): revertir sedes, boletos y lote.
      await db.delete(loteSedes).where(eq(loteSedes.loteId, lote.id));
      await db.delete(boletos).where(eq(boletos.loteId, lote.id));
      await db.delete(lotes).where(eq(lotes.id, lote.id));
      throw err;
    }
  }
```

5. Agregar la función de edición (después de `loteTieneCanjes`):

```ts
export async function editarProductosLote(
  db: DrizzleDb,
  loteId: number,
  productos: ProductoLoteInput[],
): Promise<{ ok: true } | { error: string }> {
  if (await loteTieneCanjes(db, loteId)) {
    return { error: "No se puede editar productos de un lote con canjes." };
  }
  await db.delete(loteProductos).where(eq(loteProductos.loteId, loteId));
  if (productos.length > 0) {
    await db.insert(loteProductos).values(filasLoteProductos(loteId, productos));
  }
  return { ok: true };
}
```

- [ ] **Step 4: Crear las queries de productos por lote**

Crear `src/domain/loteProductosQuery.ts`:

```ts
import { asc, eq } from "drizzle-orm";
import type { DrizzleDb } from "@/db/client";
import { boletos, loteProductos } from "@/db/schema";

export type ProductoDeLote = {
  id: number;
  productoId: number | null;
  nombre: string;
  detalle: string | null;
  precioUnitario: string | null;
  cantidadPorBoleto: number;
};

export async function productosDeLote(db: DrizzleDb, loteId: number): Promise<ProductoDeLote[]> {
  return db
    .select({
      id: loteProductos.id, productoId: loteProductos.productoId, nombre: loteProductos.nombre,
      detalle: loteProductos.detalle, precioUnitario: loteProductos.precioUnitario,
      cantidadPorBoleto: loteProductos.cantidadPorBoleto,
    })
    .from(loteProductos)
    .where(eq(loteProductos.loteId, loteId))
    .orderBy(asc(loteProductos.orden), asc(loteProductos.id));
}

export async function productosPorToken(
  db: DrizzleDb, token: string,
): Promise<{ nombre: string; detalle: string | null; cantidadPorBoleto: number }[]> {
  return db
    .select({
      nombre: loteProductos.nombre, detalle: loteProductos.detalle,
      cantidadPorBoleto: loteProductos.cantidadPorBoleto,
    })
    .from(loteProductos)
    .innerJoin(boletos, eq(boletos.loteId, loteProductos.loteId))
    .where(eq(boletos.token, token))
    .orderBy(asc(loteProductos.orden), asc(loteProductos.id));
}
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npx vitest run tests/domain/lote-productos.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Verificación y commit**

Run: `npx tsc --noEmit` (Expected: sin errores) y `npm test` (Expected: toda la suite pasa; los tests existentes de `generarLote` siguen verdes porque `productos` es opcional).

```bash
git add src/domain/boletos.ts src/domain/loteProductosQuery.ts tests/domain/lote-productos.test.ts
git commit -m "feat(domain): productos por lote (generar/consultar/editar con bloqueo)"
```

---

## Task 5: Productos en crear/editar lote — acciones y UI

**Files:**
- Modify: `src/app/(admin)/lotes/actions.ts`
- Modify: `src/app/(admin)/lotes/page.tsx`
- Modify: `src/app/(admin)/lotes/LotesPanel.tsx`

**Interfaces:**
- Consumes: `generarLote` extendido y `editarProductosLote` (Task 4), `productosDeLote`/`ProductoDeLote` (Task 4), `nombresProductos` (Task 2), `listarProductos`/`ProductoCatalogo` (Task 2), `LoteListado` (existente).
- Produces: parsing de productos desde `FormData` en las actions; nueva action `editarProductosLoteAction`; `LotesPanel` recibe `catalogo` y `productosPorLote`.

- [ ] **Step 1: Parsear productos en las actions y agregar la action de editar productos**

En `src/app/(admin)/lotes/actions.ts`:

1. Ampliar los imports:

```ts
import { anularLote, editarLote, eliminarLote, generarLote, editarProductosLote, type ProductoLoteInput } from "@/domain/boletos";
```

2. Agregar un helper para leer los productos del `FormData` (los inputs se envían como arreglos paralelos `prodNombre[]`, `prodDetalle[]`, `prodPrecio[]`, `prodCantidad[]`, `prodProductoId[]`):

```ts
function productosDesde(formData: FormData): ProductoLoteInput[] {
  const nombres = formData.getAll("prodNombre").map((v) => String(v));
  const detalles = formData.getAll("prodDetalle").map((v) => String(v));
  const precios = formData.getAll("prodPrecio").map((v) => String(v));
  const cantidades = formData.getAll("prodCantidad").map((v) => String(v));
  const productoIds = formData.getAll("prodProductoId").map((v) => String(v));
  const out: ProductoLoteInput[] = [];
  for (let i = 0; i < nombres.length; i++) {
    const nombre = (nombres[i] ?? "").trim();
    if (!nombre) continue; // ignora filas vacías
    const cantidad = Number(cantidades[i]);
    const pid = Number(productoIds[i]);
    out.push({
      nombre,
      detalle: (detalles[i] ?? "").trim() || null,
      precioUnitario: (precios[i] ?? "").trim() || null,
      cantidadPorBoleto: Number.isInteger(cantidad) && cantidad >= 1 ? cantidad : 1,
      productoId: Number.isInteger(pid) && pid > 0 ? pid : null,
    });
  }
  return out;
}
```

3. En `crearLoteAction`, pasar los productos a `generarLote`:

```ts
  const productos = productosDesde(formData);

  const { loteId } = await generarLote(db, {
    empresaId,
    descripcion,
    cantidad,
    fechaVencimiento,
    creadoPor: u.userId,
    sedeIds,
    productos,
  });
```

4. Agregar la nueva action al final del archivo:

```ts
export async function editarProductosLoteAction(formData: FormData): Promise<LoteActionResult> {
  const u = await getCurrentUser();
  if (!u || !u.puedeAdmin) redirect("/login");

  const loteId = Number(formData.get("loteId"));
  if (!loteId) return { error: "Lote inválido." };

  const productos = productosDesde(formData);
  const r = await editarProductosLote(db, loteId, productos);
  if ("error" in r) return { error: r.error };
  revalidatePath("/lotes");
}
```

- [ ] **Step 2: Cargar catálogo y productos por lote en la página**

En `src/app/(admin)/lotes/page.tsx`, cargar además el catálogo y un mapa de productos por lote:

```tsx
import { db } from "@/db/client";
import { sedes as sedesTable } from "@/db/schema";
import { listarEmpresas } from "@/domain/empresasQuery";
import { listarLotes } from "@/domain/lotesQuery";
import { listarProductos } from "@/domain/productosQuery";
import { productosDeLote } from "@/domain/loteProductosQuery";
import { LotesPanel } from "./LotesPanel";

export default async function LotesPage() {
  const [empresas, lotes, sedes, catalogo] = await Promise.all([
    listarEmpresas(db),
    listarLotes(db),
    db.select({ id: sedesTable.id, nombre: sedesTable.nombre }).from(sedesTable).orderBy(sedesTable.nombre),
    listarProductos(db),
  ]);

  const productosPorLote = Object.fromEntries(
    await Promise.all(lotes.map(async (l) => [l.id, await productosDeLote(db, l.id)] as const)),
  );

  return (
    <section className="space-y-6">
      <h1 className="text-[28px] leading-8">Lotes de boletos</h1>
      <LotesPanel
        lotes={lotes}
        empresas={empresas}
        sedes={sedes}
        catalogo={catalogo}
        productosPorLote={productosPorLote}
      />
    </section>
  );
}
```

- [ ] **Step 3: Agregar el editor de productos reutilizable en `LotesPanel`**

En `src/app/(admin)/lotes/LotesPanel.tsx`:

1. Ampliar imports y tipos de props:

```tsx
import type { ProductoCatalogo } from "@/domain/productosQuery";
import type { ProductoDeLote } from "@/domain/loteProductosQuery";
import {
  anularLoteAction,
  crearLoteAction,
  editarLoteAction,
  eliminarLoteAction,
  editarProductosLoteAction,
  type LoteActionResult,
} from "./actions";
```

2. Agregar un componente cliente `ProductosEditor` (filas dinámicas, con `<datalist>` de nombres del catálogo, autocompletado de detalle/precio al elegir un nombre existente). Pegarlo antes de `export function LotesPanel`:

```tsx
type FilaProducto = {
  productoId: number | null; nombre: string; detalle: string; precio: string; cantidad: string;
};

function nuevaFila(): FilaProducto {
  return { productoId: null, nombre: "", detalle: "", precio: "", cantidad: "1" };
}

function ProductosEditor({
  catalogo,
  initial,
  readOnly = false,
}: {
  catalogo: ProductoCatalogo[];
  initial?: ProductoDeLote[];
  readOnly?: boolean;
}) {
  const [filas, setFilas] = useState<FilaProducto[]>(
    initial && initial.length > 0
      ? initial.map((p) => ({
          productoId: p.productoId,
          nombre: p.nombre,
          detalle: p.detalle ?? "",
          precio: p.precioUnitario ?? "",
          cantidad: String(p.cantidadPorBoleto),
        }))
      : [nuevaFila()],
  );

  function set(i: number, patch: Partial<FilaProducto>) {
    setFilas((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  function onNombre(i: number, nombre: string) {
    const match = catalogo.find((c) => c.nombre.toLowerCase() === nombre.trim().toLowerCase());
    if (match) {
      set(i, { nombre, productoId: match.id, detalle: match.detalle ?? "", precio: match.precio ?? "" });
    } else {
      set(i, { nombre, productoId: null });
    }
  }

  if (readOnly) {
    return (
      <div className="sm:col-span-2 lg:col-span-5 flex flex-col gap-2">
        <span className="font-semibold text-sm text-[var(--black-100)]">Productos del lote</span>
        <div className="text-sm p-3 rounded-[var(--radius-sm)]" style={{ background: "var(--warning-10)", color: "var(--warning-150)" }}>
          El lote tiene canjes: los productos no se pueden modificar.
        </div>
        <ul className="text-sm list-disc pl-5">
          {(initial ?? []).map((p) => (
            <li key={p.id}>{p.nombre}{p.detalle ? ` · ${p.detalle}` : ""} · ×{p.cantidadPorBoleto} por boleto</li>
          ))}
          {(initial ?? []).length === 0 && <li className="list-none text-[var(--black-60)]">Sin productos.</li>}
        </ul>
      </div>
    );
  }

  return (
    <div className="sm:col-span-2 lg:col-span-5 flex flex-col gap-2">
      <span className="font-semibold text-sm text-[var(--black-100)]">Productos del lote</span>
      <datalist id="catalogo-productos">
        {catalogo.filter((c) => c.activo).map((c) => <option key={c.id} value={c.nombre} />)}
      </datalist>
      {filas.map((f, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
          <div className="sm:col-span-4">
            <Input label={i === 0 ? "Producto" : ""} list="catalogo-productos" name="prodNombre"
              value={f.nombre} onChange={(e) => onNombre(i, e.target.value)} placeholder="ej. Entrada 3D" />
            <input type="hidden" name="prodProductoId" value={f.productoId ?? ""} />
          </div>
          <div className="sm:col-span-3">
            <Input label={i === 0 ? "Detalle" : ""} name="prodDetalle" value={f.detalle}
              onChange={(e) => set(i, { detalle: e.target.value })} placeholder="ej. Sala normal" />
          </div>
          <div className="sm:col-span-2">
            <Input label={i === 0 ? "Precio (L)" : ""} name="prodPrecio" type="number" min="0" step="0.01"
              value={f.precio} onChange={(e) => set(i, { precio: e.target.value })} placeholder="0.00" />
          </div>
          <div className="sm:col-span-2">
            <Input label={i === 0 ? "Cant./boleto" : ""} name="prodCantidad" type="number" min="1"
              value={f.cantidad} onChange={(e) => set(i, { cantidad: e.target.value })} />
          </div>
          <div className="sm:col-span-1">
            <Button type="button" variant="secondary" className="text-xs px-2 py-1.5"
              onClick={() => setFilas((prev) => prev.length === 1 ? [nuevaFila()] : prev.filter((_, idx) => idx !== i))}>
              ✕
            </Button>
          </div>
        </div>
      ))}
      <div>
        <Button type="button" variant="secondary" className="text-xs px-3 py-1.5"
          onClick={() => setFilas((prev) => [...prev, nuevaFila()])}>
          + Agregar producto
        </Button>
      </div>
    </div>
  );
}
```

3. Actualizar la firma de `LotesPanel` para recibir las nuevas props:

```tsx
export function LotesPanel({
  lotes,
  empresas,
  sedes,
  catalogo,
  productosPorLote,
}: {
  lotes: LoteListado[];
  empresas: Empresa[];
  sedes: Sede[];
  catalogo: ProductoCatalogo[];
  productosPorLote: Record<number, ProductoDeLote[]>;
}) {
```

4. En el formulario "Nuevo lote", agregar `<ProductosEditor catalogo={catalogo} />` justo después de `<SedesSelector sedes={sedes} />` (antes del bloque de `crearError`).

5. Agregar el manejo de la edición de productos por separado. Añadir el estado y handler junto a los otros (después de `onEditar`):

```tsx
  const [editandoProd, setEditandoProd] = useState<LoteListado | null>(null);
  const [editarProdError, setEditarProdError] = useState<string | null>(null);

  function onEditarProductos(formData: FormData) {
    setEditarProdError(null);
    startTransition(async () => {
      const r: LoteActionResult = await editarProductosLoteAction(formData);
      if (r?.error) { setEditarProdError(r.error); return; }
      setEditandoProd(null);
    });
  }
```

6. En la columna de acciones de cada lote (dentro del `<div className="flex flex-wrap gap-2">`), agregar un botón para editar productos (habilitado solo si no hay canjes; si hay canjes, permite ver en solo lectura):

```tsx
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-xs px-3 py-1.5"
                    onClick={() => { setEditarProdError(null); setEditandoProd(l); }}
                  >
                    Productos
                  </Button>
```

7. Agregar el modal de productos al final (antes del cierre `</>`):

```tsx
      <Modal open={editandoProd !== null} onClose={() => setEditandoProd(null)} title="Productos del lote">
        {editandoProd && (
          <form key={editandoProd.id} action={onEditarProductos} className="space-y-3">
            <input type="hidden" name="loteId" value={editandoProd.id} />
            <p className="text-sm">
              Lote <strong>{editandoProd.descripcion}</strong> ({editandoProd.empresa}).
              Editar productos <strong>no</strong> regenera los QR.
            </p>
            <div className="grid grid-cols-1 gap-3">
              <ProductosEditor
                catalogo={catalogo}
                initial={productosPorLote[editandoProd.id] ?? []}
                readOnly={editandoProd.tieneCanjes}
              />
            </div>
            {editarProdError && <p className="text-sm text-[var(--error-150)]">{editarProdError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditandoProd(null)} disabled={pending}>
                Cerrar
              </Button>
              {!editandoProd.tieneCanjes && (
                <Button type="submit" variant="primary" disabled={pending}>
                  {pending ? "Guardando…" : "Guardar productos"}
                </Button>
              )}
            </div>
          </form>
        )}
      </Modal>
```

- [ ] **Step 4: Verificación**

Run: `npx tsc --noEmit` (Expected: sin errores) y `npm run build` (Expected: build exitoso).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(admin)/lotes"
git commit -m "feat(lotes): definir productos al crear/editar lote (catalogo + bloqueo con canjes)"
```

---

## Task 6: Taquilla — mostrar productos en la validación individual

**Files:**
- Modify: `src/app/canje/[token]/page.tsx`
- Modify: `src/app/canje/[token]/FormularioCanje.tsx`

**Interfaces:**
- Consumes: `productosPorToken` (Task 4).
- Produces: `FormularioCanje` recibe una prop `productos: { nombre: string; detalle: string | null; cantidadPorBoleto: number }[]` y la muestra (sin precios) en confirmación y en éxito.

- [ ] **Step 1: Cargar productos en la página de canje y pasarlos al formulario**

En `src/app/canje/[token]/page.tsx`:

1. Agregar el import:

```ts
import { productosPorToken } from "@/domain/loteProductosQuery";
```

2. Antes del `return <FormularioCanje .../>` final, cargar los productos y pasarlos:

```tsx
  const productos = await productosPorToken(db, token);
  return (
    <FormularioCanje
      token={token}
      codigo={r.boleto.codigo}
      empresa={r.boleto.empresa}
      productos={productos}
    />
  );
```

- [ ] **Step 2: Mostrar los productos en el formulario (confirmación y éxito)**

En `src/app/canje/[token]/FormularioCanje.tsx`:

1. Cambiar la firma para recibir `productos`:

```tsx
export default function FormularioCanje(
  { token, codigo, empresa, productos }: {
    token: string; codigo: string; empresa: string;
    productos: { nombre: string; detalle: string | null; cantidadPorBoleto: number }[];
  },
) {
```

2. Definir un bloque reutilizable de productos (sin precios) dentro del componente, antes del `return`:

```tsx
  const listaProductos = productos.length > 0 && (
    <div className="text-left text-sm space-y-1 pt-2 border-t" style={{ borderColor: "var(--black-10)" }}>
      <p className="font-semibold">Incluye:</p>
      <ul className="list-disc pl-5">
        {productos.map((p, i) => (
          <li key={i}>{p.nombre}{p.detalle ? ` · ${p.detalle}` : ""} · ×{p.cantidadPorBoleto}</li>
        ))}
      </ul>
    </div>
  );
```

3. En la pantalla de éxito (`if (state?.ok)`), agregar `{listaProductos}` dentro de la `Card`, después del `<p className="font-mono text-lg">{state.codigo}</p>`.

4. En la pantalla de boleto válido, agregar `{listaProductos}` dentro de la primera `Card` (la de "Boleto válido"), después del `<p className="text-sm">Empresa: {empresa}</p>`.

- [ ] **Step 3: Verificación**

Run: `npx tsc --noEmit` (Expected: sin errores) y `npm run build` (Expected: build exitoso).

- [ ] **Step 4: Commit**

```bash
git add "src/app/canje"
git commit -m "feat(taquilla): mostrar productos del lote en la validacion individual"
```

---

## Task 7: Taquilla — totalizado de productos en escaneo múltiple

**Files:**
- Create: `src/domain/totalizar.ts`
- Test: `tests/domain/totalizar.test.ts`
- Modify: `src/app/taquilla/multiple/actions.ts`
- Modify: `src/app/taquilla/multiple/MultiScanner.tsx`

**Interfaces:**
- Consumes: `productosPorToken` (Task 4).
- Produces:
  - `type ProductoBoleto = { nombre: string; cantidadPorBoleto: number }`
  - `totalizarProductos(boletos: { productos: ProductoBoleto[] }[]): { nombre: string; cantidad: number }[]` (agrupa por nombre normalizado —`lower(trim)`—, suma `cantidadPorBoleto`, ordena por nombre; devuelve el nombre con el casing de la primera aparición).
  - `infoBoleto` ahora incluye `productos: ProductoBoleto[]` en `InfoBoleto`.

- [ ] **Step 1: Escribir el test del totalizador (falla)**

Crear `tests/domain/totalizar.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { totalizarProductos } from "@/domain/totalizar";

describe("totalizarProductos", () => {
  it("suma cantidadPorBoleto por producto entre boletos y lotes", () => {
    const r = totalizarProductos([
      { productos: [{ nombre: "Entrada 3D", cantidadPorBoleto: 2 }] },
      { productos: [{ nombre: "Entrada 3D", cantidadPorBoleto: 2 }] },
      { productos: [{ nombre: "Entrada 2D", cantidadPorBoleto: 1 }] },
    ]);
    expect(r).toEqual([
      { nombre: "Entrada 2D", cantidad: 1 },
      { nombre: "Entrada 3D", cantidad: 4 },
    ]);
  });

  it("agrupa ignorando mayúsculas/espacios y conserva el primer casing", () => {
    const r = totalizarProductos([
      { productos: [{ nombre: "Combo", cantidadPorBoleto: 1 }] },
      { productos: [{ nombre: " combo ", cantidadPorBoleto: 3 }] },
    ]);
    expect(r).toEqual([{ nombre: "Combo", cantidad: 4 }]);
  });

  it("devuelve arreglo vacío sin productos", () => {
    expect(totalizarProductos([{ productos: [] }])).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run tests/domain/totalizar.test.ts`
Expected: FAIL — `@/domain/totalizar` no existe.

- [ ] **Step 3: Implementar el totalizador puro**

Crear `src/domain/totalizar.ts`:

```ts
export type ProductoBoleto = { nombre: string; cantidadPorBoleto: number };

export function totalizarProductos(
  boletos: { productos: ProductoBoleto[] }[],
): { nombre: string; cantidad: number }[] {
  const acc = new Map<string, { nombre: string; cantidad: number }>();
  for (const b of boletos) {
    for (const p of b.productos) {
      const clave = p.nombre.trim().toLowerCase();
      const prev = acc.get(clave);
      if (prev) prev.cantidad += p.cantidadPorBoleto;
      else acc.set(clave, { nombre: p.nombre.trim(), cantidad: p.cantidadPorBoleto });
    }
  }
  return Array.from(acc.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run tests/domain/totalizar.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Incluir productos en `infoBoleto`**

En `src/app/taquilla/multiple/actions.ts`:

1. Ampliar imports:

```ts
import { productosPorToken } from "@/domain/loteProductosQuery";
import type { ProductoBoleto } from "@/domain/totalizar";
```

2. Agregar `productos` al tipo `InfoBoleto`:

```ts
export type InfoBoleto = {
  token: string;
  codigo: string | null;
  estado: "valido" | "canjeado" | "anulado" | "vencido" | "invalido";
  canje?: CanjeInfo;
  productos: ProductoBoleto[];
};
```

3. En `infoBoleto`, cargar los productos y devolverlos en ambas ramas de retorno:

```ts
export async function infoBoleto(token: string): Promise<InfoBoleto> {
  const u = await getCurrentUser();
  if (!u?.puedeTaquilla) return { token, codigo: null, estado: "invalido", productos: [] };

  const r = await obtenerBoletoPorToken(db, token);
  const prods = await productosPorToken(db, token);
  const productos: ProductoBoleto[] = prods.map((p) => ({ nombre: p.nombre, cantidadPorBoleto: p.cantidadPorBoleto }));
  if (r.ok) return { token, codigo: r.boleto.codigo, estado: "valido", productos };

  const c = r.boleto?.canje;
  return {
    token,
    codigo: r.boleto?.codigo ?? null,
    estado: razonAEstado(r.razon),
    productos,
    canje: c
      ? {
          sede: c.sede,
          operador: c.operador,
          portadorNombre: c.portadorNombre,
          portadorDni: c.portadorDni,
          fecha: c.fecha ? new Date(c.fecha).toISOString() : null,
        }
      : undefined,
  };
}
```

- [ ] **Step 6: Mostrar el totalizado en `MultiScanner`**

En `src/app/taquilla/multiple/MultiScanner.tsx`:

1. Ampliar el import de utilidades:

```tsx
import { totalizarProductos } from "@/domain/totalizar";
```

2. El tipo `Item` ya extiende `InfoBoleto`, así que cada item incluye `productos`. El placeholder inicial (estado `"buscando"`) debe incluir `productos: []`. Cambiar la creación del placeholder:

```tsx
        const placeholder: Item = { token, codigo: null, estado: "buscando", productos: [] };
```

3. Calcular el totalizado de los boletos **válidos** (justo antes del `return` de la fase de escaneo, después de `const itemPorToken = ...`):

```tsx
  const totalizado = totalizarProductos(items.filter((it) => it.estado === "valido"));
```

4. Agregar una `Card` de totalizado (sin precios) después de la `Card` que lista los boletos escaneados y antes de la `Card` del formulario del portador:

```tsx
      {totalizado.length > 0 && (
        <Card>
          <p className="text-sm font-semibold mb-2">Totalizado (boletos válidos)</p>
          <ul className="space-y-1 text-sm">
            {totalizado.map((t) => (
              <li key={t.nombre} className="flex justify-between">
                <span>{t.nombre}</span>
                <span className="font-semibold">{t.cantidad}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
```

- [ ] **Step 7: Verificación y commit**

Run: `npx tsc --noEmit` (Expected: sin errores), `npm run build` (Expected: build exitoso) y `npm test` (Expected: toda la suite pasa).

```bash
git add src/domain/totalizar.ts tests/domain/totalizar.test.ts "src/app/taquilla/multiple"
git commit -m "feat(taquilla): totalizado de productos en escaneo multiple"
```

---

## Task 8: Reporte de items — dominio (resumen + detalle de canjes)

**Files:**
- Create: `src/domain/reportesProductos.ts`
- Test: `tests/domain/reportes-productos.test.ts`

**Interfaces:**
- Consumes: tablas `boletos`, `lotes`, `empresas`, `sedes`, `usuarios`, `loteProductos`.
- Produces:
  - `type ResumenProducto = { productoId: number | null; nombre: string; creados: number; canjeados: number; pendientes: number; montoCreado: number; montoCanjeado: number; montoPendiente: number }`
  - `resumenProductos(db, filtro: { empresaId?: number }): Promise<ResumenProducto[]>` (lifetime; agrupa por `productoId` con fallback a nombre normalizado; unidades = boletos no anulados/canjeados × cantidadPorBoleto)
  - `type FiltroCanjesProductos = { desde?: string; hasta?: string; sedeId?: number; empresaId?: number }`
  - `type CanjeProductoRow = { producto: string; fecha: Date | null; sede: string | null; empresa: string; loteId: number; codigo: string; cantidad: number; precioUnitario: number | null; importe: number | null; operador: string | null }`
  - `detalleCanjesProductos(db, filtro: FiltroCanjesProductos): Promise<CanjeProductoRow[]>`

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/domain/reportes-productos.test.ts`:

```ts
import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { empresas, sedes, usuarios } from "@/db/schema";
import { generarLote, canjearBoleto } from "@/domain/boletos";
import { resumenProductos, detalleCanjesProductos } from "@/domain/reportesProductos";

let close: () => Promise<void>;
afterEach(() => close?.());

async function setup(db: Awaited<ReturnType<typeof createTestDb>>["db"]) {
  const [emp] = await db.insert(empresas).values({ nombre: "Coca-Cola", prefijo: "CC" }).returning();
  const [sede] = await db.insert(sedes).values({ nombre: "DANLI" }).returning();
  const [u] = await db.insert(usuarios).values({ usuario: "t", passwordHash: "x", puedeTaquilla: true }).returning();
  return { emp, sede, u };
}

describe("resumenProductos", () => {
  it("cuenta creados/canjeados/pendientes por producto con cantidadPorBoleto y montos", async () => {
    const t = await createTestDb(); close = t.close;
    const { emp, sede, u } = await setup(t.db);
    const lote = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L", cantidad: 5, fechaVencimiento: "2099-12-31",
      productos: [{ nombre: "Entrada 3D", precioUnitario: "100.00", cantidadPorBoleto: 2 }],
    });
    await canjearBoleto(t.db, lote.boletos[0].token, { sedeId: sede.id, usuarioId: u.id, portadorNombre: "A", portadorDni: "1" });

    const res = await resumenProductos(t.db, {});
    expect(res).toHaveLength(1);
    // 5 boletos × 2 = 10 creados; 1 canjeado × 2 = 2; pendientes = 8
    expect(res[0]).toMatchObject({ nombre: "Entrada 3D", creados: 10, canjeados: 2, pendientes: 8 });
    expect(res[0].montoCreado).toBe(1000);
    expect(res[0].montoCanjeado).toBe(200);
    expect(res[0].montoPendiente).toBe(800);
  });

  it("agrupa el mismo producto entre lotes por productoId", async () => {
    const t = await createTestDb(); close = t.close;
    const { emp } = await setup(t.db);
    await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L1", cantidad: 3, fechaVencimiento: "2099-12-31",
      productos: [{ productoId: null, nombre: "Combo", cantidadPorBoleto: 1 }],
    });
    await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L2", cantidad: 2, fechaVencimiento: "2099-12-31",
      productos: [{ productoId: null, nombre: "combo", cantidadPorBoleto: 1 }],
    });
    const res = await resumenProductos(t.db, {});
    // "Combo" y "combo" (ad-hoc, productoId null) se agrupan por nombre normalizado
    expect(res).toHaveLength(1);
    expect(res[0].creados).toBe(5);
  });

  it("trata precio null como 0 en los montos", async () => {
    const t = await createTestDb(); close = t.close;
    const { emp } = await setup(t.db);
    await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L", cantidad: 4, fechaVencimiento: "2099-12-31",
      productos: [{ nombre: "Sin precio", cantidadPorBoleto: 1 }],
    });
    const res = await resumenProductos(t.db, {});
    expect(res[0].montoCreado).toBe(0);
  });
});

describe("detalleCanjesProductos", () => {
  it("devuelve una fila por canje×producto con importe y filtra por empresa", async () => {
    const t = await createTestDb(); close = t.close;
    const { emp, sede, u } = await setup(t.db);
    const lote = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L", cantidad: 2, fechaVencimiento: "2099-12-31",
      productos: [
        { nombre: "Entrada 3D", precioUnitario: "100", cantidadPorBoleto: 2 },
        { nombre: "Combo", precioUnitario: "50", cantidadPorBoleto: 1 },
      ],
    });
    await canjearBoleto(t.db, lote.boletos[0].token, { sedeId: sede.id, usuarioId: u.id, portadorNombre: "Juan", portadorDni: "1" });

    const filas = await detalleCanjesProductos(t.db, { empresaId: emp.id });
    // 1 canje × 2 productos = 2 filas
    expect(filas).toHaveLength(2);
    const e3d = filas.find((f) => f.producto === "Entrada 3D")!;
    expect(e3d).toMatchObject({ empresa: "Coca-Cola", sede: "DANLI", cantidad: 2, operador: "t" });
    expect(e3d.importe).toBe(200);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run tests/domain/reportes-productos.test.ts`
Expected: FAIL — `@/domain/reportesProductos` no existe.

- [ ] **Step 3: Implementar el reporte**

Crear `src/domain/reportesProductos.ts`:

```ts
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { DrizzleDb } from "@/db/client";
import { boletos, lotes, empresas, sedes, loteProductos, usuarios } from "@/db/schema";

export type ResumenProducto = {
  productoId: number | null;
  nombre: string;
  creados: number;
  canjeados: number;
  pendientes: number;
  montoCreado: number;
  montoCanjeado: number;
  montoPendiente: number;
};

export async function resumenProductos(
  db: DrizzleDb,
  filtro: { empresaId?: number },
): Promise<ResumenProducto[]> {
  const grupo = sql<string>`coalesce(${loteProductos.productoId}::text, lower(trim(${loteProductos.nombre})))`;
  const cond = filtro.empresaId ? [eq(lotes.empresaId, filtro.empresaId)] : [];

  const rows = await db
    .select({
      productoId: loteProductos.productoId,
      nombre: sql<string>`min(${loteProductos.nombre})`,
      creados: sql<number>`sum(case when ${boletos.estado} != 'anulado' then ${loteProductos.cantidadPorBoleto} else 0 end)::int`,
      canjeados: sql<number>`sum(case when ${boletos.estado} = 'canjeado' then ${loteProductos.cantidadPorBoleto} else 0 end)::int`,
      montoCreado: sql<number>`coalesce(sum(case when ${boletos.estado} != 'anulado' then ${loteProductos.cantidadPorBoleto} * coalesce(${loteProductos.precioUnitario},0) else 0 end),0)::float8`,
      montoCanjeado: sql<number>`coalesce(sum(case when ${boletos.estado} = 'canjeado' then ${loteProductos.cantidadPorBoleto} * coalesce(${loteProductos.precioUnitario},0) else 0 end),0)::float8`,
    })
    .from(loteProductos)
    .innerJoin(lotes, eq(loteProductos.loteId, lotes.id))
    .innerJoin(boletos, eq(boletos.loteId, loteProductos.loteId))
    .where(cond.length ? and(...cond) : undefined)
    .groupBy(grupo, loteProductos.productoId)
    .orderBy(sql`min(${loteProductos.nombre})`);

  return rows.map((r) => ({
    productoId: r.productoId,
    nombre: r.nombre,
    creados: r.creados,
    canjeados: r.canjeados,
    pendientes: r.creados - r.canjeados,
    montoCreado: r.montoCreado,
    montoCanjeado: r.montoCanjeado,
    montoPendiente: r.montoCreado - r.montoCanjeado,
  }));
}

export type FiltroCanjesProductos = { desde?: string; hasta?: string; sedeId?: number; empresaId?: number };

export type CanjeProductoRow = {
  producto: string;
  fecha: Date | null;
  sede: string | null;
  empresa: string;
  loteId: number;
  codigo: string;
  cantidad: number;
  precioUnitario: number | null;
  importe: number | null;
  operador: string | null;
};

const operadores = alias(usuarios, "operadores_rp");

export async function detalleCanjesProductos(
  db: DrizzleDb,
  filtro: FiltroCanjesProductos,
): Promise<CanjeProductoRow[]> {
  const cond = [eq(boletos.estado, "canjeado")];
  if (filtro.empresaId) cond.push(eq(lotes.empresaId, filtro.empresaId));
  if (filtro.sedeId) cond.push(eq(boletos.canjeSedeId, filtro.sedeId));
  if (filtro.desde) cond.push(gte(boletos.canjeFecha, new Date(filtro.desde)));
  if (filtro.hasta) cond.push(lte(boletos.canjeFecha, new Date(filtro.hasta + "T23:59:59")));

  return db
    .select({
      producto: loteProductos.nombre,
      fecha: boletos.canjeFecha,
      sede: sedes.nombre,
      empresa: empresas.nombre,
      loteId: boletos.loteId,
      codigo: boletos.codigo,
      cantidad: loteProductos.cantidadPorBoleto,
      precioUnitario: sql<number | null>`${loteProductos.precioUnitario}::float8`,
      importe: sql<number | null>`(${loteProductos.cantidadPorBoleto} * ${loteProductos.precioUnitario})::float8`,
      operador: operadores.usuario,
    })
    .from(boletos)
    .innerJoin(loteProductos, eq(loteProductos.loteId, boletos.loteId))
    .innerJoin(lotes, eq(boletos.loteId, lotes.id))
    .innerJoin(empresas, eq(lotes.empresaId, empresas.id))
    .leftJoin(sedes, eq(boletos.canjeSedeId, sedes.id))
    .leftJoin(operadores, eq(boletos.canjeUsuarioId, operadores.id))
    .where(and(...cond))
    .orderBy(asc(boletos.canjeFecha));
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run tests/domain/reportes-productos.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Verificación y commit**

Run: `npx tsc --noEmit` (Expected: sin errores) y `npm test` (Expected: toda la suite pasa).

```bash
git add src/domain/reportesProductos.ts tests/domain/reportes-productos.test.ts
git commit -m "feat(domain): reporte de items (resumen por producto + detalle de canjes)"
```

---

## Task 9: Reporte de items — UI + exportación CSV

**Files:**
- Modify: `src/domain/exportar.ts` (exportar el helper `esc` para reutilizarlo)
- Create: `src/domain/exportarProductos.ts`
- Test: `tests/domain/exportar-productos.test.ts`
- Create: `src/app/(admin)/reportes/productos/page.tsx`
- Create: `src/app/(admin)/reportes/productos/exportar/route.ts`
- Modify: `src/app/(admin)/reportes/page.tsx`

**Interfaces:**
- Consumes: `resumenProductos`, `detalleCanjesProductos`, `CanjeProductoRow`, `FiltroCanjesProductos` (Task 8); `listarEmpresas` (existente); `sedes` table.
- Produces: `aCsvCanjesProductos(filas: CanjeProductoRow[]): string`; ruta `/reportes/productos` y `/reportes/productos/exportar`.

- [ ] **Step 1: Escribir el test del CSV (falla)**

Crear `tests/domain/exportar-productos.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { aCsvCanjesProductos } from "@/domain/exportarProductos";
import type { CanjeProductoRow } from "@/domain/reportesProductos";

describe("aCsvCanjesProductos", () => {
  it("genera encabezado y filas con importe", () => {
    const filas: CanjeProductoRow[] = [
      {
        producto: "Entrada 3D", fecha: new Date("2026-07-17T20:32:00Z"), sede: "DANLI",
        empresa: "Coca-Cola", loteId: 12, codigo: "MCC-ABC123", cantidad: 2,
        precioUnitario: 100, importe: 200, operador: "taquilla1",
      },
    ];
    const csv = aCsvCanjesProductos(filas);
    const lineas = csv.trim().split("\n");
    expect(lineas[0]).toBe("producto,empresa,sede,loteId,codigo,cantidad,precioUnitario,importe,operador,fecha");
    expect(lineas[1]).toContain("Entrada 3D,Coca-Cola,DANLI,12,MCC-ABC123,2,100,200,taquilla1,");
  });

  it("escapa comas y comillas", () => {
    const filas: CanjeProductoRow[] = [
      {
        producto: 'Combo "grande", 2', fecha: null, sede: null, empresa: "X", loteId: 1,
        codigo: "MX-1", cantidad: 1, precioUnitario: null, importe: null, operador: null,
      },
    ];
    const csv = aCsvCanjesProductos(filas);
    expect(csv).toContain('"Combo ""grande"", 2"');
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run tests/domain/exportar-productos.test.ts`
Expected: FAIL — `@/domain/exportarProductos` no existe.

- [ ] **Step 3: Implementar el CSV**

Primero, exportar el helper `esc` existente para reutilizarlo. En `src/domain/exportar.ts`, cambiar la línea `function esc(v: string): string {` por:

```ts
export function esc(v: string): string {
```

(No cambia el comportamiento; `tests/domain/exportar.test.ts` sigue verde.)

Luego crear `src/domain/exportarProductos.ts`:

```ts
import type { CanjeProductoRow } from "@/domain/reportesProductos";
import { esc } from "@/domain/exportar";

export function aCsvCanjesProductos(filas: CanjeProductoRow[]): string {
  const cols = ["producto", "empresa", "sede", "loteId", "codigo", "cantidad", "precioUnitario", "importe", "operador", "fecha"];
  const head = cols.join(",");
  const body = filas.map((f) => [
    f.producto, f.empresa, f.sede ?? "", String(f.loteId), f.codigo, String(f.cantidad),
    f.precioUnitario == null ? "" : String(f.precioUnitario),
    f.importe == null ? "" : String(f.importe),
    f.operador ?? "", f.fecha ? f.fecha.toISOString() : "",
  ].map((x) => esc(String(x))).join(",")).join("\n");
  return `${head}\n${body}\n`;
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run tests/domain/exportar-productos.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Crear el route handler de CSV**

Crear `src/app/(admin)/reportes/productos/exportar/route.ts`:

```ts
import { db } from "@/db/client";
import { detalleCanjesProductos } from "@/domain/reportesProductos";
import { aCsvCanjesProductos } from "@/domain/exportarProductos";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const num = (k: string) => (url.searchParams.get(k) ? Number(url.searchParams.get(k)) : undefined);
  const str = (k: string) => url.searchParams.get(k) ?? undefined;
  const filas = await detalleCanjesProductos(db, {
    empresaId: num("empresaId"), sedeId: num("sedeId"), desde: str("desde"), hasta: str("hasta"),
  });
  const csv = "﻿" + aCsvCanjesProductos(filas); // BOM para que Excel abra en UTF-8
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="items.csv"`,
    },
  });
}
```

- [ ] **Step 6: Crear la página del reporte**

Crear `src/app/(admin)/reportes/productos/page.tsx` (server component; los filtros se leen de `searchParams`, mismo patrón de filtros por querystring que el CSV). El filtro de empresa aplica a ambas tablas; fecha/sede aplican solo al detalle:

```tsx
import Link from "next/link";
import { db } from "@/db/client";
import { sedes as sedesTable } from "@/db/schema";
import { listarEmpresas } from "@/domain/empresasQuery";
import { resumenProductos, detalleCanjesProductos } from "@/domain/reportesProductos";
import { Card } from "@/components/ui/Card";
import { Table, Th, Td } from "@/components/ui/Table";

function money(n: number): string {
  return `L.${n.toFixed(2)}`;
}

export default async function ReporteProductosPage(
  { searchParams }: { searchParams: Promise<Record<string, string | undefined>> },
) {
  const sp = await searchParams;
  const empresaId = sp.empresaId ? Number(sp.empresaId) : undefined;
  const sedeId = sp.sedeId ? Number(sp.sedeId) : undefined;
  const desde = sp.desde || undefined;
  const hasta = sp.hasta || undefined;

  const [empresas, sedes, resumen, detalle] = await Promise.all([
    listarEmpresas(db),
    db.select({ id: sedesTable.id, nombre: sedesTable.nombre }).from(sedesTable).orderBy(sedesTable.nombre),
    resumenProductos(db, { empresaId }),
    detalleCanjesProductos(db, { empresaId, sedeId, desde, hasta }),
  ]);

  const qs = new URLSearchParams(
    Object.entries({ empresaId, sedeId, desde, hasta })
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => [k, String(v)]),
  ).toString();

  return (
    <section className="space-y-6">
      <h1 className="text-[28px] leading-8">Reporte de items</h1>

      <Card>
        <form method="get" className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Empresa</span>
            <select name="empresaId" defaultValue={empresaId ?? ""} className="input">
              <option value="">Todas</option>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Sede (detalle)</span>
            <select name="sedeId" defaultValue={sedeId ?? ""} className="input">
              <option value="">Todas</option>
              {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Desde (detalle)</span>
            <input type="date" name="desde" defaultValue={desde ?? ""} className="input" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Hasta (detalle)</span>
            <input type="date" name="hasta" defaultValue={hasta ?? ""} className="input" />
          </label>
          <button type="submit" className="btn btn-primary">Filtrar</button>
        </form>
        <p className="text-xs mt-2" style={{ color: "var(--black-60)" }}>
          Los filtros de fecha y sede aplican al detalle de canjes. El resumen refleja totales de por vida por empresa.
        </p>
      </Card>

      <Card>
        <h2 className="text-base font-semibold mb-4">Resumen por producto</h2>
        <Table>
          <thead>
            <tr>
              <Th>Producto</Th><Th>Creados</Th><Th>Canjeados</Th><Th>Pendientes</Th>
              <Th>Valor creado</Th><Th>Valor canjeado</Th><Th>Valor pendiente</Th>
            </tr>
          </thead>
          <tbody>
            {resumen.length === 0 && (
              <tr><Td colSpan={7} className="text-center text-[var(--black-60)]">Sin datos.</Td></tr>
            )}
            {resumen.map((r) => (
              <tr key={`${r.productoId ?? "adhoc"}-${r.nombre}`}>
                <Td className="font-semibold">{r.nombre}</Td>
                <Td>{r.creados}</Td>
                <Td>{r.canjeados}</Td>
                <Td>{r.pendientes}</Td>
                <Td>{money(r.montoCreado)}</Td>
                <Td>{money(r.montoCanjeado)}</Td>
                <Td>{money(r.montoPendiente)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Detalle de canjes</h2>
          <a className="btn btn-secondary text-xs px-3 py-1.5" href={`/reportes/productos/exportar${qs ? `?${qs}` : ""}`}>
            Exportar CSV
          </a>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Producto</Th><Th>Empresa</Th><Th>Sede</Th><Th>Código</Th>
              <Th>Cant.</Th><Th>Importe</Th><Th>Operador</Th><Th>Fecha</Th>
            </tr>
          </thead>
          <tbody>
            {detalle.length === 0 && (
              <tr><Td colSpan={8} className="text-center text-[var(--black-60)]">Sin canjes en el rango.</Td></tr>
            )}
            {detalle.map((d, i) => (
              <tr key={i}>
                <Td className="font-semibold">{d.producto}</Td>
                <Td>{d.empresa}</Td>
                <Td>{d.sede ?? "—"}</Td>
                <Td className="font-mono">{d.codigo}</Td>
                <Td>{d.cantidad}</Td>
                <Td>{d.importe == null ? "—" : money(d.importe)}</Td>
                <Td>{d.operador ?? "—"}</Td>
                <Td>{d.fecha ? new Date(d.fecha).toLocaleString("es-HN") : "—"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Link href="/reportes" className="text-sm" style={{ color: "var(--blue-hover)" }}>← Volver a Reportes</Link>
    </section>
  );
}
```

- [ ] **Step 7: Enlazar el reporte desde la página de Reportes**

En `src/app/(admin)/reportes/page.tsx`, agregar un enlace a `/reportes/productos`. Ubicarlo junto al encabezado de la página (después del `<h1>`), por ejemplo:

```tsx
      <Link href="/reportes/productos" className="btn btn-secondary text-sm">
        Reporte de items
      </Link>
```

Asegurarse de que `import Link from "next/link";` esté presente al inicio del archivo (agregarlo si falta).

- [ ] **Step 8: Verificación y commit**

Run: `npx tsc --noEmit` (Expected: sin errores), `npm run build` (Expected: build exitoso; aparecen `/reportes/productos` y `/reportes/productos/exportar`) y `npm test` (Expected: toda la suite pasa).

```bash
git add src/domain/exportarProductos.ts tests/domain/exportar-productos.test.ts "src/app/(admin)/reportes"
git commit -m "feat(reportes): reporte de items con importes + exportacion CSV"
```

---

## Verificación final

- [ ] **Suite completa:** `npm test` (toda la suite verde, incluidos los tests existentes).
- [ ] **Tipos + build:** `npx tsc --noEmit` y `npm run build` sin errores.
- [ ] **Migración presente:** confirmar que existe `drizzle/0002_*.sql` con `productos` y `lote_productos` (para aplicar en el despliegue con `npm run db:migrate`).
- [ ] **Recordatorio de despliegue:** el push a `master` (autor `appjeffhn@gmail.com`) dispara el autodeploy; correr `db:migrate` contra Neon antes/junto al despliegue. No hacer push sin que el usuario lo pida.

## Self-Review (cobertura del spec)

- Modelo bundle + cantidad por boleto → Task 1 (schema `cantidadPorBoleto`), Task 4 (generar/copiar), Task 7/8 (totalizar/contar ×cantidad). ✔
- Catálogo reutilizable (CRUD + desactivar) → Task 2 (dominio), Task 3 (UI + nav). ✔
- Precio sugerido por catálogo, editable por lote, copiado (snapshot) → Task 3 (precio catálogo), Task 5 (autocompleta y permite editar el precio por fila; `productoId` + copia). ✔
- Edición de productos de lote bloqueada con canjes, sin regenerar QR → Task 4 (`editarProductosLote` + test de bloqueo e intactos), Task 5 (modal solo lectura si `tieneCanjes`). ✔
- Taquilla individual muestra productos sin precios → Task 6. ✔
- Taquilla múltiple con totalizado sin precios → Task 7. ✔
- Reporte: resumen por producto (empresa), detalle con filtros fecha/empresa/sede, importes, CSV → Task 8 (dominio), Task 9 (UI + CSV). ✔
- Restricciones (neon-http sin transacciones, Tegucigalpa, permisos, tests PGlite) → reflejadas en Global Constraints y en cada task. ✔
