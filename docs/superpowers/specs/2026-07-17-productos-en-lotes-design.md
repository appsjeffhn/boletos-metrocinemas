# Productos en lotes + totalizado en taquilla + reporte de items — Diseño

**Fecha:** 2026-07-17
**Base:** `master` (v2.2/v3 en producción). Stack: Next.js 16 (App Router, TS) · Drizzle ORM · Neon Postgres (neon-http) / PGlite (tests) · Vitest · Tailwind v4 · Merlin design system.

## Objetivo

Permitir describir **qué productos** entrega cada boleto de un lote (ej. "Entrada 3D", "Combo palomitas"), verlos en la pantalla de validación de taquilla, ver un **totalizado por producto** en el escaneo múltiple, y contar con un **reporte detallado** de items creados, canjeados, pendientes y sus importes.

## Decisiones (confirmadas con el usuario)

1. **Modelo bundle:** cada boleto del lote vale por **todos** los productos definidos en ese lote. El totalizado suma por nombre de producto.
2. **Cantidad configurable por boleto:** cada producto del lote tiene una `cantidadPorBoleto` (ej. cada boleto = 2× "Entrada 3D"). Escanear N boletos = N × cantidadPorBoleto por producto.
3. **Catálogo de productos reutilizable:** una tabla `productos` administrable (crear/editar/desactivar). Al armar el lote se eligen del catálogo (con opción de crear uno nuevo al vuelo).
4. **Precios:** el catálogo guarda un **precio sugerido**; al agregar el producto a un lote específico ese precio se autocompleta pero es **editable por lote**. El reporte usa el precio guardado en el lote. Moneda: Lempiras (L).
5. **Copia (snapshot) al lote:** `lote_productos` **copia** nombre/detalle/precio del catálogo al agregarse. Cambiar el catálogo después **no altera** los lotes ya creados (ni su reporte); solo afecta lotes nuevos.
6. **Edición bloqueada con canjes:** los productos de un lote se pueden editar/agregar libremente **mientras el lote no tenga canjes**; una vez que hay al menos un canje, la sección de productos queda **solo lectura**. Esto congela la historia y hace el reporte exacto sin tablas de snapshot por canje.
7. **El QR no cambia:** el QR solo codifica el token (`/canje/{token}`); los productos se leen en vivo de la BD al escanear. Editar productos (cuando está permitido) **no** regenera ni invalida los QR.
8. **Reporte:** resumen por producto (creados/canjeados/pendientes + montos), filtros por fecha/empresa/sede, detalle de canjes por producto, y exportación CSV.

### Fuera de alcance (YAGNI)

- Editar productos de un lote **con** canjes ya hechos (explícitamente rechazado).
- Tabla de snapshot por canje (`canje_productos`): innecesaria porque la edición se bloquea con canjes y `lote_productos` ya copia los datos del catálogo.

## Modelo de datos

Archivo: `src/db/schema.ts`. Migración nueva vía `db:generate` (`0002_*.sql`).

> **Nota Drizzle/Neon:** el driver `drizzle-orm/neon-http` **no** soporta `db.transaction()`. Donde haya inserts multi-tabla que deban ser atómicos (crear lote + sus productos), usar el mismo patrón de **rollback compensatorio** que ya usa `generarLote` (borrar lo insertado si falla un paso posterior).

### Tabla `productos` (catálogo)

| columna | tipo | notas |
|---|---|---|
| `id` | serial PK | |
| `nombre` | text notNull unique | ej. "Entrada 3D" |
| `detalle` | text nullable | descripción por defecto |
| `precio` | numeric(10,2) nullable | precio unitario sugerido (Lempiras) |
| `activo` | boolean notNull default true | desactivar sin borrar |
| `creadoEn` | timestamp notNull defaultNow | |

- Índice único ya implícito en `nombre`.
- `numeric(10,2)` se maneja como `string` en JS con Drizzle; convertir al calcular montos.

### Tabla `lote_productos`

| columna | tipo | notas |
|---|---|---|
| `id` | serial PK | |
| `loteId` | int notNull FK→lotes.id | |
| `productoId` | int nullable FK→productos.id | referencia al catálogo (null si ad-hoc) |
| `nombre` | text notNull | **copiado** del catálogo al agregar |
| `detalle` | text nullable | copiado |
| `precioUnitario` | numeric(10,2) nullable | copiado; editable por lote |
| `cantidadPorBoleto` | int notNull default 1 | |
| `orden` | int notNull default 0 | orden de visualización |
| `creadoEn` | timestamp notNull defaultNow | |

- Índice en `loteId` (listar productos de un lote) y en `productoId` (reporte por producto).
- Los lotes existentes quedan sin filas en `lote_productos` (productos opcionales).

## Fórmulas de conteo (bundle + cantidad + precio)

Por cada fila de `lote_productos` (producto P en lote L):

- **Unidades creadas** = (boletos de L con estado ≠ `anulado`) × `cantidadPorBoleto`
- **Unidades canjeadas** = (boletos de L con estado = `canjeado`) × `cantidadPorBoleto`
- **Unidades pendientes** = creadas − canjeadas
- **Monto creado / canjeado / pendiente** = unidades × `precioUnitario` (0 si precio null)

**Agrupación entre lotes** (para el resumen del reporte): por `productoId` cuando existe; para ad-hoc (productoId null), por `lower(trim(nombre))`. Se muestra el `nombre` guardado.

Como la edición se bloquea al haber canjes y `lote_productos` es una copia, el reporte se reconstruye siempre desde `lote_productos` + estados de `boletos`, sin distorsión histórica.

## Componentes y flujo

Patrón existente respetado: **página server** (carga vía `src/domain/*Query.ts`) → **panel/formulario cliente** → **server action** (`actions.ts`, valida permisos con `getCurrentUser()`) → **función de dominio pura** (`src/domain/*`, recibe `DrizzleDb`, testeable con PGlite).

### A. Catálogo de productos (admin)

- **Dominio:** `src/domain/productosQuery.ts` — `listarProductos(db)`, `nombresProductos(db)` (para autocompletar), y en `src/domain/productos.ts` — `crearProducto`, `editarProducto`, `desactivarProducto`.
- **UI:** nueva ruta `src/app/(admin)/productos/page.tsx` + `ProductosPanel.tsx` (tabla CRUD: nombre, detalle, precio, activo). Enlace "Productos" en la navegación (`AppNav.tsx`/`AppShell.tsx`).
- **Actions:** `src/app/(admin)/productos/actions.ts`.

### B. Productos en el lote (crear/editar)

- **Dominio (`src/domain/boletos.ts`):**
  - Extender `generarLote` para recibir `productos: { productoId?, nombre, detalle?, precioUnitario?, cantidadPorBoleto }[]` e insertarlos en `lote_productos` (rollback compensatorio incluido).
  - `productosDeLote(db, loteId)` para listar.
  - `editarProductosLote(db, loteId, productos)` que **rechaza** si el lote tiene canjes (verifica con la consulta de `tieneCanjes`). No toca ni regenera boletos.
- **UI (`src/app/(admin)/lotes/LotesPanel.tsx`):** sección "Productos del lote" con filas dinámicas — selector del catálogo (autocompleta detalle y precio sugerido), campo `precio` editable, `cantidad por boleto`, botón "+ Agregar producto" y "quitar". Opción "+ Nuevo producto" que lo crea en el catálogo y lo agrega. En el modal de editar: sección **solo lectura con aviso** si `tieneCanjes`.
- **Actions (`src/app/(admin)/lotes/actions.ts`):** extender `crearLoteAction` y `editarLoteAction` para persistir productos; el editar de productos es independiente de la regeneración de boletos.

### C. Taquilla — validación individual

- **`src/app/canje/[token]/page.tsx`:** cargar `productosDeLote` del boleto y mostrarlos (nombre · detalle · "×N por boleto") en la tarjeta de confirmación.
- **`FormularioCanje.tsx`:** repetir el listado de productos en la pantalla de éxito (verde).

### D. Taquilla — escaneo múltiple + totalizado

- **`src/app/taquilla/multiple/actions.ts`:** `infoBoleto(token)` devuelve también los productos del lote del boleto. Nueva función de dominio `totalizarProductos(boletosValidos)` que agrupa por producto (productoId/nombre) y suma `cantidadPorBoleto` sobre los boletos **válidos a canjear** de la sesión.
- **`src/app/taquilla/multiple/MultiScanner.tsx`:** panel de **totalizado** (producto → cantidad total) visible antes y después de confirmar. Ej.: 3 boletos (Entrada 3D ×2) + 2 (Entrada 2D ×1) → **6 Entrada 3D · 2 Entrada 2D**.

### E. Reporte de items

- **Dominio:** `src/domain/reportesProductos.ts`:
  - `resumenProductos(db, filtro)` → por producto: creados, canjeados, pendientes, monto creado/canjeado/pendiente. `filtro` = { desde?, hasta?, empresaId?, sedeId? } (fecha por `canjeFecha` para canjeados).
  - `detalleCanjesProductos(db, filtro)` → filas: producto, fecha/hora, sede, empresa, lote, cantidad, precioUnitario, importe, quién canjeó.
- **UI:** `src/app/(admin)/reportes/productos/page.tsx` con filtros (rango de fechas, empresa, sede) reutilizando el patrón de `reportes/`; tabla resumen + tabla de detalle. Enlace desde la sección de Reportes.
- **CSV:** route handler `src/app/(admin)/reportes/productos/exportar/route.ts` (GET con querystring, BOM UTF-8, reutiliza `src/domain/exportar.ts`).

## Manejo de errores / validaciones

- Server actions validan permisos (`puedeAdmin` para catálogo/lotes/reportes; `puedeTaquilla` para taquilla) igual que el resto de la app.
- Crear lote: cada producto requiere `nombre` no vacío y `cantidadPorBoleto ≥ 1`; `precioUnitario` opcional (≥ 0 si se da).
- Editar productos de lote **con canjes** → la acción retorna error claro y la UI muestra solo lectura.
- Nombre de producto duplicado en el catálogo → error de unicidad manejado con mensaje amable.
- Precio (numeric) parseado con cuidado (string↔number); montos con precio null cuentan como 0.

## Pruebas (Vitest + PGlite, `fileParallelism:false`)

- `productos`: crear/editar/desactivar; unicidad de nombre.
- `lote_productos`: `generarLote` con productos (copia de datos); `editarProductosLote` permitido sin canjes y **rechazado** con canjes; edición no altera boletos/QR.
- `reportesProductos`: fórmulas creados/canjeados/pendientes con `cantidadPorBoleto`; agrupación por productoId y por nombre normalizado; montos con precio y con precio null; filtros fecha/empresa/sede.
- `totalizarProductos`: suma correcta entre lotes distintos.
- Verificación antes de cada commit: `tsc` + `build` + `test`.

## Restricciones globales

- UI en español, tema Merlin (tokens en `merlin-design-system.md` / `globals.css`).
- No romper el canje atómico (`UPDATE ... WHERE estado='activo'`) ni la restricción por sede (`loteSedes`).
- `neon-http` sin transacciones → rollback compensatorio donde aplique.
- Fecha "hoy"/vencimiento en `America/Tegucigalpa` (helper `hoyISO()` existente).
- Autodeploy: push a `master` con git author `appjeffhn@gmail.com`.

## Orden sugerido de implementación

1. Schema + migración (`productos`, `lote_productos`).
2. Catálogo de productos (dominio + `/productos` CRUD).
3. Productos en crear/editar lote (dominio + UI, bloqueo con canjes).
4. Taquilla: validación individual muestra productos.
5. Taquilla: totalizado en escaneo múltiple.
6. Reporte de items (`/reportes/productos`) + CSV.
7. Pruebas transversales y verificación final.
