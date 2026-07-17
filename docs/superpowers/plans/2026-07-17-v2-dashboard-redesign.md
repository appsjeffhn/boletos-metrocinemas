# Boletos Metrocinemas v2 — Dashboard, features y rediseño Merlin

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Convertir la app v1 en una v2 con dashboard de KPIs, reportes navegables, gestión completa de empresas/lotes/usuarios (multi-sede y roles combinados), descarga masiva de QR, y un rediseño visual completo con el sistema de diseño Merlin.

**Architecture:** Sobre la base Next.js 16 + Drizzle + Neon existente. Se agregan tablas puente (lote_sedes, usuario_sedes), flags de rol, campos de anulación y teléfono. Se introduce una capa de UI compartida (tokens Merlin + componentes) y se rediseñan todas las páginas. Auth pasa de rol único/sede única a capacidades (admin/taquilla) + multi-sede con sede activa elegida al login.

**Tech Stack:** Next.js 16 · TypeScript · Drizzle ORM · Postgres Neon/PGlite · Vitest · Tailwind v4 · next/font (Work Sans) · qrcode · jszip · html5-qrcode.

## Global Constraints

- **Sistema de diseño Merlin** (de `merlin-design-system.md`). Tokens exactos como CSS variables en `:root`:
  - Fuente: **Work Sans** (vía `next/font/google`).
  - Fondo página `--background-page: #f7f8fb`; texto `--black-100: #1e1e1e`.
  - Primario/CTA/destructivo `--coral-100: #09142e` (navy) texto blanco; hover `--coral-hover: #071026`.
  - Acento marca (dorado) `--blue-100: #fca801`; hover `--blue-hover: #cf8a01`; tinte `--blue-10: #fff6e6`.
  - Estados: error `--error-150: #910022`; success `--success-150: #1b8959`; warning `--warning-150: #a16b00`; info `--info-150: #0a53a5` (+ variantes -10/-100/-200 del md).
  - Neutrals: `--black-60: #606060` (helper), `--black-40: #969696` (disabled), `--black-10: #f3f3f3`, `--black-0: #ffffff` (cards).
  - Radios: inputs/botones `--radius-sm: 12px`; cards/alerts `--radius-md: 16px`; pill `--radius-pill: 32px`; full `--radius-full: 100px`.
  - Sombras: `--shadow-2/4/8/12` (ver md).
  - Tamaños: header 48/500, title 28/400, subtitle 16/600, body 16/400, caption 12/700.
  - Botones: Primary (bg coral-100 / texto blanco), Secondary (bg blanco / texto coral-100 / borde sutil), Tertiary (bg blue-10 / texto blue-100), destructivo usa coral-100 con texto/acento error.
- **Logo:** `public/logo.png` (estrella dorada + texto blanco). Se muestra sobre fondo navy (coral-100) en el header de admin y en taquilla.
- **Decisiones de producto (confirmadas):**
  1. Un lote aplica a un conjunto de complejos; **el canje solo es válido si la sede activa del operador está en ese conjunto** (si no: rechazo "No válido en esta sede").
  2. Un usuario puede tener capacidad **admin y/o taquilla** simultáneamente y estar asignado a **una, varias o todas** las sucursales. Al iniciar sesión, si tiene taquilla y >1 sede, **elige la sede activa** (queda fija en la sesión).
  3. La pantalla de "boleto ya canjeado" muestra **portador (nombre + DNI)** y **operador** (usuario que registró el canje), además de sede y fecha.
  4. Descarga de QR: **ZIP con un PNG por boleto** (nombre = código) **y** PDF en grilla.
  5. Anular un lote pide **motivo**, advierte que **es irreversible** y que los boletos quedan inutilizables.
- UI en español. Node 24, npm. Tests con `fileParallelism:false` (ya configurado).
- No romper el canje atómico (`UPDATE ... WHERE estado='activo'`).

## File Structure (nuevos/relevantes)

```
public/logo.png
src/app/layout.tsx            # Work Sans + metadata
src/app/globals.css           # tokens Merlin + estilos base
src/components/ui/            # Button, Card, Input, Select, Badge, StatCard, Modal, Table
src/components/AppShell.tsx    # header con logo + nav (admin)
src/components/BrandHeader.tsx # header con logo (taquilla/login)
src/db/schema.ts              # + telefono, lote_sedes, usuario_sedes, flags, anulacion
src/test/db.ts                # DDL espejo del schema nuevo
src/lib/auth.ts               # SessionPayload nuevo (capacidades + sedes + activeSedeId)
src/lib/session.ts            # sin cambios de API salvo tipos
src/domain/*.ts               # canje con restricción de sede + nombres; anular con motivo;
                              # empresas update/delete; usuarios update/multi-sede; dashboard; reportes detalle
src/app/(admin)/dashboard/    # nueva home
src/app/(admin)/reportes/     # rediseño + detalle navegable
src/app/(admin)/empresas/     # rediseño + editar/eliminar
src/app/(admin)/usuarios/     # rediseño + editar/multi-sede/roles
src/app/(admin)/lotes/        # rediseño + multi-sede + anular con motivo + descargas
src/app/api/lote/[id]/qr-zip/route.ts   # ZIP de PNGs
src/app/taquilla/ + canje/    # rediseño + sede activa + nombres en canjeado
src/app/login/ + elegir-sede/ # rediseño + selección de sede activa
scripts/seed.ts               # backfill de flags/sedes idempotente
```

---

## Task 1: Fundación de diseño (tokens Merlin, Work Sans, componentes UI, AppShell, logo)

**Files:**
- Modify: `src/app/layout.tsx`, `src/app/globals.css`
- Create: `src/components/ui/Button.tsx`, `Card.tsx`, `Input.tsx`, `Select.tsx`, `Badge.tsx`, `StatCard.tsx`, `Modal.tsx`, `Table.tsx`, `src/components/AppShell.tsx`, `src/components/BrandHeader.tsx`
- Modify: `src/app/(admin)/layout.tsx` (usar AppShell)

**Interfaces (Produces):**
- CSS variables Merlin en `:root` (todos los tokens del md).
- `Button({variant?: "primary"|"secondary"|"tertiary"|"danger", ...})`, `Card`, `Input` (con label/error), `Select`, `Badge({tone})`, `StatCard({label, value, hint?, icon?})`, `Modal` (client, con `open`/`onClose`), `Table` helpers.
- `AppShell({children, active})` — header navy con `public/logo.png`, nav (Dashboard, Reportes, Empresas, Lotes, Usuarios), botón "Cerrar sesión" (server action, ya existe `cerrarSesion`).
- `BrandHeader()` — barra navy con logo, para taquilla/login.

- [ ] **Step 1: Work Sans en `layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import "./globals.css";

const workSans = Work_Sans({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-work-sans" });

export const metadata: Metadata = { title: "Boletos Metrocinemas", description: "Boletos digitales" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={workSans.variable}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: `globals.css`** — reemplazar contenido con: `@import "tailwindcss";` (Tailwind v4), luego `:root { ... }` con TODOS los tokens del `merlin-design-system.md` (copiar del §1.1), más:

```css
:root { --font-family: var(--font-work-sans), 'Work Sans', sans-serif; }
* { box-sizing: border-box; }
body { background: var(--background-page); color: var(--black-100); font-family: var(--font-family); font-size: 16px; line-height: 24px; }
h1 { font-size: 28px; line-height: 32px; font-weight: 400; }
/* Clases utilitarias de marca (para uso con className) */
.card { background: var(--black-0); border-radius: var(--radius-md); box-shadow: var(--shadow-2); }
.btn { border-radius: var(--radius-sm); font-weight: 600; padding: 10px 20px; cursor: pointer; transition: background .15s; }
.btn-primary { background: var(--coral-100); color: #fff; } .btn-primary:hover { background: var(--coral-hover); }
.btn-secondary { background: #fff; color: var(--coral-100); box-shadow: inset 0 0 0 1px var(--coral-10); }
.btn-tertiary { background: var(--blue-10); color: var(--blue-100); }
.btn-danger { background: var(--error-150); color: #fff; }
.input { background: var(--background-page); border: 1px solid var(--black-10); border-radius: var(--radius-sm); padding: 10px 12px; width: 100%; }
.input:focus { outline: 2px solid var(--blue-100); }
```

- [ ] **Step 3: componentes UI** — crear cada archivo en `src/components/ui/` como componentes tipados. Ejemplo `Button.tsx`:

```tsx
import { clsx } from "clsx"; // si no está: usar template strings, no agregar dep
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary"|"secondary"|"tertiary"|"danger" };
export function Button({ variant = "primary", className = "", ...p }: Props) {
  return <button {...p} className={`btn btn-${variant} ${className}`} />;
}
```
(No agregar `clsx`; usar interpolación de strings.) `Card` envuelve en `<div className="card p-5">`. `Input` renderiza `<label>` + `<input className="input">` + mensaje de error opcional. `StatCard` muestra número grande (title/header size), label caption en `--black-60`, dentro de `.card`. `Badge` colorea según `tone` (success/warning/error/info/neutral) usando los `--*-10`/`--*-150`. `Modal` es `"use client"` con overlay y `.card`. `Table` puede ser wrappers simples con estilos.

- [ ] **Step 4: `AppShell.tsx`** (server component) — header:

```tsx
import Link from "next/link";
import Image from "next/image";
import { cerrarSesion } from "@/app/(admin)/logout/actions";

const NAV = [
  { href: "/dashboard", label: "Dashboard" }, { href: "/reportes", label: "Reportes" },
  { href: "/empresas", label: "Empresas" }, { href: "/lotes", label: "Lotes" },
  { href: "/usuarios", label: "Usuarios" },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh" }}>
      <header style={{ background: "var(--coral-100)" }} className="text-white">
        <div className="max-w-6xl mx-auto flex items-center gap-6 px-4 h-16">
          <Image src="/logo.png" alt="Metrocinemas" width={120} height={32} priority />
          <nav className="flex gap-4 text-sm flex-1">
            {NAV.map(n => <Link key={n.href} href={n.href} className="hover:text-[var(--blue-100)]">{n.label}</Link>)}
          </nav>
          <form action={cerrarSesion}><button className="text-sm text-white/80 hover:text-white">Cerrar sesión</button></form>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}
```
Update `(admin)/layout.tsx` to keep the admin/getCurrentUser guard but render `<AppShell>{children}</AppShell>`.

- [ ] **Step 5:** `BrandHeader.tsx` — barra navy con el logo centrado (para taquilla/login).

- [ ] **Step 6: Verificar** — `npx tsc --noEmit` limpio, `npm run build` OK. (Aún sin tests nuevos.) Commit: `feat(ui): fundación de diseño Merlin + componentes + AppShell`.

---

## Task 2: Migración de esquema (multi-sede, roles, teléfono, anulación)

**Files:** Modify `src/db/schema.ts`, `src/test/db.ts`; generate `drizzle/`.
**Interfaces (Produces):**
- `empresas.telefono` (text, nullable).
- `usuarios`: `puedeAdmin` (bool, default false), `puedeTaquilla` (bool, default false). (`rol` pasa a nullable; `sedeId` se conserva nullable pero deja de usarse.)
- Tabla `usuarioSedes` (`usuarioId`, `sedeId`, PK compuesta) — sedes asignadas a un usuario taquilla.
- Tabla `loteSedes` (`loteId`, `sedeId`, PK compuesta) — complejos donde el lote es válido.
- `lotes`: `anuladoEn` (timestamp, nullable), `anuladoMotivo` (text, nullable), `anuladoPor` (int ref usuarios, nullable).

- [ ] **Step 1:** Actualizar `schema.ts` con lo anterior. Para `usuarios.rol` usar `.$type` existente pero quitar `.notNull()` (nullable). Agregar `puedeAdmin`/`puedeTaquilla` bool notNull default false. Definir `usuarioSedes` y `loteSedes` con `primaryKey({columns:[...]})`.
- [ ] **Step 2:** Espejar en `src/test/db.ts` (DDL crea las 2 tablas puente, columnas nuevas, `rol` nullable). Mantener índices.
- [ ] **Step 3:** Test `tests/db/schema-v2.test.ts`: inserta usuario con `puedeAdmin:true,puedeTaquilla:true`, asigna 2 sedes en `usuarioSedes`, un lote con 2 `loteSedes`, y verifica lecturas. Correr y pasar.
- [ ] **Step 4:** `npm run db:generate` (con DATABASE_URL dummy) para producir migración. Commit incluye `drizzle/`. `npm test` + `tsc` OK. Commit.

---

## Task 3: Auth y sesión (capacidades + multi-sede + sede activa)

**Files:** Modify `src/lib/auth.ts`, `src/lib/session.ts`, `src/middleware.ts`, `src/app/login/actions.ts`, `src/app/login/page.tsx`; Create `src/app/elegir-sede/page.tsx` + `actions.ts`.
**Interfaces (Produces):**
- `SessionPayload = { userId:number; puedeAdmin:boolean; puedeTaquilla:boolean; sedeIds:number[]; activeSedeId:number|null }`.
- `signSession/verifySession` con el nuevo payload.
- Login: valida usuario/activo/password; carga capacidades + `sedeIds` (de `usuarioSedes`); firma sesión. Destino:
  - si `puedeTaquilla` y `sedeIds.length>1` y no hay activeSedeId → redirige a `/elegir-sede`.
  - si `puedeTaquilla` y `sedeIds.length===1` → activeSedeId = esa; destino taquilla.
  - si solo admin → `/dashboard`.
  - si admin+taquilla → `/dashboard` (puede cambiar a taquilla desde el menú).
- `/elegir-sede`: lista las sedes del usuario; al elegir, re-firma la sesión con `activeSedeId` y redirige a `/taquilla`.
- Middleware: rutas admin (`/dashboard`,`/reportes`,`/empresas`,`/lotes`,`/usuarios`) requieren `puedeAdmin`; `/taquilla`,`/canje` requieren `puedeTaquilla`; sin sesión → `/login`; sin capacidad → redirige a la que tenga.

- [ ] Steps: TDD para el nuevo `signSession/verifySession` (payload nuevo) en `tests/lib/auth.test.ts` (actualizar). Implementar login/middleware/elegir-sede. `tsc`+`build` OK. Commit.

*(Nota: backfill de datos en prod se hace en Task 14/seed; en dev el seed crea el admin con `puedeAdmin:true`.)*

---

## Task 4: Dominio — canje con restricción de sede + nombres; anular con motivo

**Files:** Modify `src/domain/boletos.ts`; Tests `tests/domain/canjear.test.ts`, `tests/domain/anular.test.ts`.
**Interfaces (Produces):**
- `obtenerBoletoPorToken` retorna además, cuando `canjeado`: `canje.portadorNombre`, `canje.portadorDni`, `canje.operador` (usuario que canjeó) y `canje.sede`, `canje.fecha`.
- `canjearBoleto(db, token, datos, hoy?)` donde `datos.sedeId` es la **sede activa**; agrega validación: si el lote tiene `loteSedes` y `sedeId` no está en ellas → `{ ok:false, razon:"sede_no_valida" }`. (Si el lote no tiene sedes asignadas = válido en todas, compatibilidad.)
- `anularLote(db, loteId, { motivo, usuarioId })` — set boletos activos→anulado y `lotes.anuladoEn/anuladoMotivo/anuladoPor`. Requiere `motivo` no vacío (throw si vacío).

- [ ] Steps: TDD — test de canje rechazado por sede no válida; canje ok cuando sede está en el lote; nombres de portador+operador presentes al releer un canjeado; anular con motivo persiste motivo/fecha/usuario y no toca canjeados; anular sin motivo lanza. `npm test`+`tsc` OK. Commit.

---

## Task 5: Dominio — dashboard KPIs + reportes detalle + empresas/usuarios queries

**Files:** Create `src/domain/dashboard.ts`; Modify `src/domain/reportes.ts`, `src/domain/empresasQuery.ts`, add `src/domain/usuariosQuery.ts`.
**Interfaces (Produces):**
- `dashboardKpis(db)` → `{ empresas:number; lotesActivos:number; boletosEmitidos:number; boletosCanjeados:number; boletosPendientes:number; boletosAnulados:number; canjesHoy:number; canjesPorSede:{sede:string;canjeados:number}[]; ultimosCanjes:{codigo,empresa,sede,portadorNombre,fecha}[] }`. "lotesActivos" = lotes no anulados con ≥1 boleto activo.
- `detalleEmpresa(db, empresaId)` → info empresa + sus lotes con conteos + lista de canjes (reusar `listarCanjes`).
- `empresaTieneLotesActivos(db, empresaId)` → boolean (para permitir/negar borrado).
- `listarUsuarios(db)` → usuarios con capacidades + nombres de sedes asignadas.

- [ ] Steps: TDD por función (conteos que cuadran; canjesHoy usa fecha America/Tegucigalpa; empresaTieneLotesActivos true/false). Commit.

---

## Task 6: Empresas — rediseño + crear/editar/eliminar (con teléfono y guarda)

**Files:** `src/app/(admin)/empresas/page.tsx`, `actions.ts`.
**Interfaces (Consumes):** `listarEmpresas`, `empresaTieneLotesActivos`, `normalizarPrefijo`.
- Acciones: `crearEmpresa` (nombre, prefijo, contacto, **telefono**), `editarEmpresa(id, ...)`, `eliminarEmpresa(id)` — solo si `!empresaTieneLotesActivos` (si tiene, retorna error "No se puede eliminar: tiene lotes activos"). Todas con guarda admin.
- UI (Merlin): tabla/tarjetas de empresas con nombre, prefijo (`M{prefijo}-`), contacto, teléfono; botón Editar (abre Modal con formulario) y Eliminar (confirma en Modal; deshabilitado/explicado si tiene lotes activos). Formulario de alta arriba.

- [ ] Steps: implementar; `tsc`+`build` OK; verificación manual. Commit. *(La lógica de guarda ya está testeada en Task 5.)*

---

## Task 7: Usuarios — rediseño + crear/editar + multi-sede + roles combinados

**Files:** `src/app/(admin)/usuarios/page.tsx`, `actions.ts`.
**Interfaces (Consumes):** `listarUsuarios`, `hashPassword`, sedes.
- `crearUsuario` / `editarUsuario`: usuario, (password opcional en edición), checkboxes **Admin** y **Taquilla** (ambos posibles), y selección de sedes: opción "Todas" o multiselección (checkboxes) — persistir en `usuarioSedes` (reemplazar set). Validaciones: al menos una capacidad; si taquilla, al menos una sede. Guarda admin.
- `activar/desactivar` usuario (toggle `activo`).
- UI (Merlin): lista de usuarios con capacidades (Badges Admin/Taquilla) y sedes; Editar en Modal.

- [ ] Steps: implementar; `tsc`+`build` OK. Commit.

---

## Task 8: Lotes — rediseño + multi-sede al crear + anular con motivo + descargas

**Files:** `src/app/(admin)/lotes/page.tsx`, `actions.ts`, `src/app/(admin)/lotes/[id]/imprimir/page.tsx`, `src/app/api/lote/[id]/qr-zip/route.ts`. Add dep `jszip`.
**Interfaces (Consumes):** `generarLote` (extender para recibir `sedeIds:number[]` y crear `loteSedes`), `anularLote`, `boletosDeLote`, `listarLotes` (incluir estado anulado y sedes).
- Crear lote: empresa, descripción, cantidad, vencimiento, **selección de complejos** (checkboxes: "Todos" o algunos). Guarda admin. `generarLote` inserta `loteSedes`.
- Listar lotes: empresa, descripción, cantidad, vencimiento, complejos (badges), estado (Activo/Anulado con motivo en tooltip), acciones: Imprimir, **Descargar ZIP**, **Descargar PDF**, **Anular**.
- Anular: Modal que pide **motivo** (textarea requerida), muestra advertencia destacada "Esta acción no se puede revertir. Los boletos quedarán inutilizables." Botón destructivo. Llama `anularLote(db, id, {motivo, usuarioId})`.
- `GET /api/lote/[id]/qr-zip`: genera un ZIP (jszip) con un PNG por boleto (`QRCode.toBuffer` de la URL de canje), nombrado `${codigo}.png`; responde `application/zip` con `Content-Disposition: attachment; filename="lote-${id}-qr.zip"`.
- Imprimir (PDF en grilla): mantener/rediseñar con estilos Merlin (para impresión sigue siendo grilla clara).

- [ ] Steps: extender `generarLote` (TDD: crea loteSedes) — actualizar test de generar-lote; implementar UI + ZIP endpoint. `tsc`+`build`+`npm test` OK. Commit.

---

## Task 9: Dashboard (nueva home)

**Files:** `src/app/(admin)/dashboard/page.tsx`. Redirigir `/` y post-login admin a `/dashboard`.
**Interfaces (Consumes):** `dashboardKpis`.
- UI (Merlin): fila de `StatCard` (Empresas, Lotes activos, Emitidos, Canjeados, Pendientes, Canjes hoy). Sección "Canjes por sede" (tabla/barras simples con tokens). Sección "Últimos canjes" (tabla). Todo con cards, sombras, dorado para acentos.
- Actualizar `src/app/page.tsx` y login para que admin caiga en `/dashboard`.

- [ ] Steps: implementar; `tsc`+`build` OK. Commit.

---

## Task 10: Reportes — rediseño + detalle navegable

**Files:** `src/app/(admin)/reportes/page.tsx`, `src/app/(admin)/reportes/[empresaId]/page.tsx`.
**Interfaces (Consumes):** `reportePorEmpresa`, `detalleEmpresa`, `listarCanjes`, `aCsv` (export sigue disponible).
- `/reportes`: tabla por empresa (emitidos/canjeados/pendientes) donde cada fila es **enlace** a `/reportes/[empresaId]` (ver sin descargar). Botón "Exportar CSV" se mantiene.
- `/reportes/[empresaId]`: detalle — datos de la empresa, sus lotes con conteos, y **tabla de canjes** (código, sede, portador, DNI, operador, fecha) navegable en pantalla; botón "Exportar CSV" de ese filtro.

- [ ] Steps: implementar; `tsc`+`build` OK. Commit.

---

## Task 11: Taquilla + canje — rediseño + sede activa + nombres en canjeado

**Files:** `src/app/taquilla/page.tsx`, `src/components/Scanner.tsx` (mantener fix v1), `src/app/canje/[token]/page.tsx`, `FormularioCanje.tsx`, `actions.ts`.
**Interfaces (Consumes):** sesión con `activeSedeId`; `obtenerBoletoPorToken`, `canjearBoleto`.
- Taquilla: `BrandHeader` con logo; muestra la **sede activa** (nombre) y opción "Cambiar sede" (→ `/elegir-sede`) si tiene varias. Scanner con estilos Merlin.
- `confirmarCanje`: usa `activeSedeId` de la sesión (no del form); si el usuario no tiene taquilla o sin sede activa → error claro. Propaga `razon:"sede_no_valida"` → mensaje "Este boleto no es válido en esta sede".
- Pantalla verde (éxito) y roja (rechazo) rediseñadas con tokens (success/error). En "ya canjeado" mostrar **sede, fecha, portador (nombre + DNI) y operador**.
- Validar server-side portador nombre/DNI no vacíos (cierra el menor pendiente de v1).

- [ ] Steps: implementar; `tsc`+`build` OK; verificación manual. Commit.

---

## Task 12: Login + landing rediseño

**Files:** `src/app/login/page.tsx`, `src/app/page.tsx`, `src/app/elegir-sede/page.tsx`.
- Login (Merlin): card centrada sobre fondo con `BrandHeader`/logo, inputs y botón primario.
- `/` redirige según sesión (admin→/dashboard, solo taquilla→/taquilla o /elegir-sede).
- `/elegir-sede`: cards de sedes del usuario.

- [ ] Steps: implementar; `tsc`+`build` OK. Commit.

---

## Task 13: Seed + backfill de datos v2

**Files:** Modify `scripts/seed.ts`.
- Seed idempotente: sedes; admin con `puedeAdmin:true` (y `puedeTaquilla:false`), sin sedes.
- Backfill (para bases existentes): `UPDATE usuarios SET puede_admin=true WHERE rol='admin'; UPDATE usuarios SET puede_taquilla=true WHERE rol='taquilla'`; e insertar en `usuarioSedes` la `sedeId` previa de los taquilla. Ejecutable de forma segura múltiples veces.

- [ ] Steps: implementar; `tsc` OK. Commit.

---

## Task 14: Deploy v2 (migración + backfill en prod)

- [ ] `npm test` + `tsc` + `npm run build` verdes.
- [ ] Merge a `master`, push → autodeploy (autor `appjeffhn@gmail.com`).
- [ ] Correr `db:migrate` contra prod (pull env production), luego backfill/seed.
- [ ] Verificación E2E en el navegador: login→dashboard; crear empresa con teléfono; crear lote con complejos; anular con motivo; descargar ZIP; reportes detalle; taquilla con sede activa; canjeado muestra portador+operador.

---

## Self-Review (cobertura del pedido)

- Dashboard con KPIs en tiempo real → Task 5 (queries) + Task 9. ✔
- Reportes navegables sin descargar → Task 10. ✔
- Empresas: editar, teléfono, eliminar si no hay lotes activos → Tasks 5,6. ✔
- Lotes: selección de complejos (uno/todos/algunos), anular con motivo + advertencia irreversible → Tasks 2,4,8. ✔
- Usuarios: editar, multi-sede (una/varias/todas), admin+taquilla simultáneos → Tasks 2,3,5,7. ✔
- Logo en taquilla y admin → Task 1 (AppShell/BrandHeader). ✔
- Ya canjeado muestra quién canjeó (portador + operador) → Tasks 4,11. ✔
- Rediseño Merlin en toda la plataforma → Task 1 + rediseño en cada página (6–12). ✔
- Descargar todos los QR individuales (ZIP) + PDF → Task 8. ✔
- Canje restringido por sede del lote → Tasks 2,4,11. ✔
