# Configuración: sección con Usuarios, Sedes y Zona horaria — Diseño

**Fecha:** 2026-07-17
**Base:** `master` (feature de productos en lotes ya desplegado). Stack: Next.js 16 (App Router, TS) · Drizzle · Neon Postgres (neon-http) / PGlite (tests) · Vitest · Tailwind v4 · Merlin.

## Objetivo

Agrupar la administración en una sección **Configuración** (reemplaza "Usuarios" en el menú), con una landing de botones-tarjeta (estilo `/reportes`) que da acceso a **Usuarios**, **Sedes/Sucursales** y **Zona horaria**. Agregar CRUD de sedes (ver/crear/editar/activar-desactivar) y hacer la **zona horaria ajustable** desde la app. Modales bien adaptados a móvil.

## Decisiones (confirmadas con el usuario)

1. **Sede = Sucursal = Complejo** → un solo concepto y un solo CRUD; etiqueta "Sedes" en la UI.
2. **Configuración** reemplaza el ítem "Usuarios" del menú y agrupa Usuarios + Sedes + Zona horaria. **Empresas** se queda como menú aparte.
3. **Zona horaria ajustable** desde una **lista de zonas comunes** (no la lista IANA completa).
4. **Sedes sin borrado**: solo crear/editar/activar/desactivar (se referencian en lotes/canjes/usuarios; desactivar preserva el historial).

### Fuera de alcance (YAGNI)
- Jerarquía sucursal→sede (son el mismo concepto).
- Lista IANA completa de zonas horarias.
- Borrado físico de sedes.

## Arquitectura / navegación

- `AppNav`: el ítem **Usuarios** pasa a **Configuración** → `/configuracion`.
- `/configuracion` = landing con botones-tarjeta (mismo patrón que `/reportes`): **Usuarios**, **Sedes**, **Zona horaria**.
- Rutas nuevas bajo el grupo `(admin)`:
  - `/configuracion` (landing)
  - `/configuracion/usuarios` (se **mueve** la pantalla actual de `/usuarios`)
  - `/configuracion/sedes` (nueva)
  - `/configuracion/zona-horaria` (nueva)
- `middleware.ts`: en `ADMIN_PREFIXES` y en el `matcher`, reemplazar `/usuarios` por `/configuracion` (protege todas las subrutas admin).
- Patrón respetado: página server (carga vía `src/domain/*Query.ts`) → panel cliente con `useTransition` + `Modal` → server action en `actions.ts` que valida `puedeAdmin` con `getCurrentUser()` → dominio puro (`src/domain/*`, recibe `DrizzleDb`).

## Modelo de datos

Migración nueva vía `db:generate` (aditiva; se aplica en el deploy con `db:migrate`). El helper de tests `src/test/db.ts` debe reflejar los cambios.

### `sedes` (modificar)
Agregar columna:
- `activo boolean notNull default true`

`nombre` sigue siendo único. Las filas existentes quedan `activo = true`.

### `configuracion` (nueva, fila única)
| columna | tipo | notas |
|---|---|---|
| `id` | integer PK | siempre `1` (fila única) |
| `zonaHoraria` | text notNull default `'America/Tegucigalpa'` | identificador IANA |
| `actualizadoEn` | timestamp notNull defaultNow | |

## Componentes y flujo

### A. Shell de Configuración
- `src/app/(admin)/configuracion/page.tsx`: landing con 3 botones-tarjeta (`Card` dentro de `Link`), estilo `/reportes`: Usuarios, Sedes, Zona horaria.
- `AppNav.tsx`: cambiar `{ href: "/usuarios", label: "Usuarios" }` por `{ href: "/configuracion", label: "Configuración" }`.
- `middleware.ts`: `/usuarios` → `/configuracion` en `ADMIN_PREFIXES` y `matcher`.

### B. Usuarios (reubicar + pulir)
- Mover `src/app/(admin)/usuarios/{page,UsuariosPanel,actions}.tsx` a `src/app/(admin)/configuracion/usuarios/`.
- Actualizar los `revalidatePath("/usuarios")` en las acciones a `/configuracion/usuarios`.
- La lógica existente (crear/editar/`toggleUsuarioActivo`, asignación de sedes) se conserva. Ajustar la UI al patrón botón + `Modal` si aún no lo está, y usar el `Modal` responsivo (sección F).
- El selector de sedes al crear/editar usuario muestra **solo sedes activas**.

### C. Sedes/Sucursales — CRUD (`/configuracion/sedes`)
- **Dominio nuevo:**
  - `src/domain/sedesQuery.ts`: `type SedeAdmin = { id: number; nombre: string; activo: boolean }`; `listarSedes(db): Promise<SedeAdmin[]>` (todas, orden por nombre); `sedesActivas(db): Promise<{ id: number; nombre: string }[]>` (solo `activo=true`, para selectores).
  - `src/domain/sedes.ts`: `crearSede(db, nombre)`, `editarSede(db, id, nombre)`, `toggleSedeActiva(db, id)`. Validan nombre no vacío; unicidad manejada con mensaje amable (patrón de `productos.ts`: catch a violación única, rethrow lo demás).
- **UI:** `src/app/(admin)/configuracion/sedes/{page,SedesPanel,actions}.tsx` con el patrón de `ProductosPanel` (tabla + "Nueva sede" + editar en `Modal` + activar/desactivar con `Modal` de confirmación).
- **Regla de "inactiva":**
  - Selectores para asignaciones **nuevas** (crear/editar lote, crear/editar usuario, elegir-sede de taquilla) usan `sedesActivas`.
  - Referencias existentes (`loteSedes`, `usuarioSedes`, `boletos.canjeSedeId`) se preservan; una sede inactiva sigue mostrándose en datos históricos.
  - Filtros de **reportes** por sede muestran **todas** las sedes (incluye inactivas, para consultar historial).
  - `elegir-sede`: filtra a activas dentro de las asignadas al operador; si no queda ninguna activa, mostrar mensaje y no listar.

### D. Zona horaria (`/configuracion/zona-horaria`)
- **Dominio:** `src/domain/configuracion.ts`: `zonaHoraria(db): Promise<string>` (lee la fila `id=1`; si falta, devuelve `'America/Tegucigalpa'`); `guardarZonaHoraria(db, tz): Promise<{ ok: true } | { error: string }>` (valida contra la lista permitida; upsert de la fila `id=1`).
- **Lista de zonas:** `src/lib/zonasHorarias.ts` — `ZONAS_HORARIAS: { id: string; label: string }[]` (ej. `America/Tegucigalpa` "Tegucigalpa (UTC-6)", `America/Guatemala`, `America/El_Salvador`, `America/Managua`, `America/Mexico_City`, `America/New_York`, `America/Los_Angeles`, `America/Bogota`, `America/Panama`, `UTC`). Un `Set` de ids válidos para validar.
- **UI:** `src/app/(admin)/configuracion/zona-horaria/{page,actions}.tsx`: `<select>` con la lista, valor actual seleccionado, guardar con server action (admin), mensaje de éxito/error.

### E. Refactor de fechas (aplicar la zona configurada)
Hoy `America/Tegucigalpa` está *hardcodeado* en `src/domain/boletos.ts` (`hoyISO`) y `src/domain/dashboard.ts` (`hoyISO`, `fechaISOTegucigalpa`).
- Crear helper puro `src/lib/fechas.ts`: `hoyISOEn(tz: string): string` y `fechaISOEn(fecha: Date, tz: string): string` (usan `Intl.DateTimeFormat("en-CA", { timeZone: tz })`).
- Las funciones de dominio de canje (`obtenerBoletoPorToken`, `canjearBoleto`, `canjearMultiple`) **ya reciben `hoy` como parámetro** (default actual `hoyISO()`). Cambiar el default a `hoyISOEn("America/Tegucigalpa")` (fallback) y hacer que **los llamadores** pasen `hoy` calculado con la zona configurada:
  - Llamadores: `src/app/canje/[token]/page.tsx`, `src/app/canje/[token]/actions.ts`, `src/app/taquilla/multiple/actions.ts` → leer `zonaHoraria(db)` y pasar `hoy = hoyISOEn(tz)`.
- `dashboard.ts`: `dashboardKpis` lee la zona configurada y usa `hoyISOEn(tz)` / `fechaISOEn(fecha, tz)` en lugar de las constantes.
- El dominio sigue puro (la zona entra como dato), así los tests inyectan `hoy`/`tz` sin depender de la config global.

### F. Modales responsivos
- `src/components/ui/Modal.tsx`: ya tiene `max-h-[90vh] overflow-y-auto` + `w-full`. Mejoras: prop opcional `size?: "md" | "lg"` (`max-w-md` / `max-w-2xl`) para formularios grandes (ej. editar lote con productos, crear/editar usuario), y asegurar buen relleno/anchura en móvil (`p-4` del overlay + `w-full`). Aplicar `size="lg"` donde el contenido lo amerite.

## Manejo de errores / validaciones
- Todas las server actions validan `puedeAdmin` (`getCurrentUser()` → `redirect("/login")`).
- Sedes: nombre no vacío; duplicado → mensaje amable (no 500). No se puede desactivar dejando el sistema sin sedes activas si eso rompe taquilla — se permite, pero se documenta; la validación dura no es requerida.
- Zona horaria: solo se aceptan ids de la lista permitida.

## Pruebas (Vitest + PGlite, `fileParallelism:false`)
- `sedes`: crear/editar/`toggleSedeActiva`; unicidad de nombre; `sedesActivas` excluye inactivas; `listarSedes` las incluye.
- `configuracion`: `zonaHoraria` devuelve default sin fila; `guardarZonaHoraria` upsert + rechaza zona inválida.
- `fechas`: `hoyISOEn(tz)`/`fechaISOEn` con distintas zonas (ej. una fecha UTC cercana a medianoche cae en día distinto según tz).
- Canje/vencimiento: sigue correcto pasando `hoy` explícito (tests existentes intactos).
- Verificación por tarea: `tsc` + `build` + `test`.

## Restricciones globales
- UI en español, tema Merlin.
- `neon-http` sin transacciones → compensación manual donde haya inserts multi-tabla (no aplica mucho aquí; sedes/config son de una tabla).
- Permisos: `puedeAdmin` para toda la sección Configuración.
- Migración aditiva; se aplica en el deploy (`db:migrate`).
- Autodeploy: push a `master` con autor `appjeffhn@gmail.com`.

## Orden de implementación (fases, de menor a mayor riesgo)
1. **Shell Configuración** (landing + nav + middleware) + **mover Usuarios** + **Modal responsivo** (prop `size`).
2. **Sedes CRUD** (esquema `activo` + migración + dominio + UI + ocultar inactivas en selectores).
3. **Zona horaria** (tabla `configuracion` + lista + selector UI + refactor de fechas en boletos/dashboard/llamadores).

## Self-review (cobertura del pedido)
- Zona horaria ajustable + mostrada en Configuración → D + E. ✔
- Usuarios pasa a Configuración → A + B. ✔
- Ver/editar/crear sedes con botones estilo reportes + activar/desactivar → C. ✔
- Modales bien adaptados → F. ✔
