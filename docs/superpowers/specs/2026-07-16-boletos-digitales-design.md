# Boletos Digitales — Metrocinemas

**Fecha:** 2026-07-16
**Estado:** Diseño aprobado (pendiente revisión final del usuario)

## 1. Problema

Metrocinemas entrega boletos digitales de cortesía. Hoy el flujo es manual:

1. Se generan códigos (ej. `MMOK01`…`MMOK10`) y se imprimen como QR.
2. Los boletos se reparten a clientes, muchas veces empresas grandes que los
   redistribuyen entre sus empleados.
3. En taquilla, el administrador escanea el QR y **llena a mano** un Excel
   (`CANJEDEBOLETOSMOK.xlsx`) con: código, complejo/sede, nombre del cliente,
   DNI y fecha de canje.

Problemas del flujo actual:

- **Nada evita la duplicidad:** el mismo QR puede canjearse varias veces.
- **No hay validación de vencimiento ni de autenticidad** (un QR falso no se
  detecta).
- **Los reportes por cliente son manuales** y propensos a error.

## 2. Objetivo

Una aplicación web que:

- Genere códigos y sus QR únicos de forma automática y en lote.
- Al escanear en taquilla, autocomplete la mayor parte de los datos y solo pida
  lo mínimo manual (nombre y DNI del portador).
- Impida fraudes y duplicidades (canje único, detección de QR inválido,
  vencimiento).
- Produzca reportes automáticos de cuántos boletos se canjearon, por empresa,
  por sede y por fecha.

## 3. Decisiones tomadas

| Tema | Decisión |
|------|----------|
| Plataforma | App web responsiva (móvil + escritorio) |
| Stack | Next.js (App Router) + Postgres gestionado (Neon) |
| Hospedaje | Vercel + Neon (Vercel Marketplace) |
| Uso del boleto | **Un solo canje** (anti-fraude) |
| Clientes grandes | **Lote por empresa**, cada boleto con QR único |
| Roles | Admin central + Taquilla (por sede) |
| Validez extra | Fecha de vencimiento + válido en cualquier sede |
| Datos manuales al canjear | Nombre del portador + DNI del portador |
| Formato de código legible | `M{INICIALES}-XXXXXX` — `M` + iniciales de la empresa (ej. empresa "MOK" → `MMOK-7F3K9Q`; "Coca Cola" → `MCC-7F3K9Q`) |
| Login de taquilla | Usuario/contraseña, cada cuenta asignada a una sede |

## 4. Sedes (fijas)

NOVACENTRO, PLAZA AMERICA, PLAZA MIRAFLORES, MEGAMALL, DANLI,
SANTA ROSA DE COPAN, PUERTO CORTES.

## 5. Modelo de datos

### `sedes`
- `id`
- `nombre` (único, una de las 7)

### `usuarios`
- `id`
- `email` / `usuario` (único)
- `password_hash`
- `rol`: `admin` | `taquilla`
- `sede_id` (nullable; requerido para `taquilla`, ignorado para `admin`)
- `activo` (bool)
- `creado_en`

### `empresas` (clientes grandes)
- `id`
- `nombre` (único)
- `prefijo` (iniciales de la empresa, ej. `MOK`, `CC`; se antepone `M` al generar el
  código, así "MOK" produce `MMOK-XXXXXX`). Se auto-sugiere del nombre pero el admin
  lo puede editar. Solo A–Z y 0–9, 1–6 caracteres.
- `contacto` (nullable)
- `notas` (nullable)
- `creado_en`

### `lotes`
- `id`
- `empresa_id` → `empresas`
- `descripcion` (ej. "Cortesías agosto 2026")
- `cantidad` (nº de boletos generados)
- `fecha_vencimiento` (date)
- `creado_por` → `usuarios`
- `creado_en`

### `boletos`
- `id`
- `lote_id` → `lotes`
- `codigo` (único, formato `M{INICIALES}-XXXXXX`, legible por humanos)
- `token` (único, alta entropía; es lo que va dentro del QR)
- `estado`: `activo` | `canjeado` | `anulado`
- **Datos de canje (nullable hasta el canje):**
  - `canje_sede_id` → `sedes`
  - `canje_portador_nombre`
  - `canje_portador_dni`
  - `canje_fecha` (timestamp)
  - `canje_usuario_id` → `usuarios`
- `creado_en`

Índices: `boletos.token` (único), `boletos.codigo` (único),
`boletos.lote_id`, `boletos.estado`.

## 6. Anti-fraude

El QR **no** contiene datos del boleto, solo un `token` aleatorio de alta
entropía (imposible de adivinar o falsificar). La URL del QR apunta a la pantalla
de canje: `https://<app>/canje/<token>`.

Al escanear, la validación aplica en orden y de forma **atómica**
(transacción / `UPDATE ... WHERE estado='activo'`):

1. **Token inexistente** → "Boleto inválido / falso".
2. **`estado = canjeado`** → "Ya fue canjeado el {fecha} en {sede}" (muestra
   quién y dónde).
3. **`estado = anulado`** → "Boleto anulado".
4. **Lote vencido** (`fecha_vencimiento < hoy`) → "Boleto vencido".
5. **Válido** → pantalla verde; se autocompletan código, empresa, sede (la sede
   del usuario de taquilla), fecha/hora; el admin escribe **nombre y DNI del
   portador** y confirma.

La confirmación cambia `estado` a `canjeado` en una sola operación condicional,
por lo que **dos escaneos simultáneos del mismo QR** nunca producen doble canje
(el segundo recibe "ya canjeado").

## 7. Flujos por rol

### Admin central
- Crear/editar empresas.
- Generar lotes: elige empresa, cantidad y fecha de vencimiento → la app crea N
  boletos con código + token + QR.
- Descargar QR para imprimir (PDF/PNG en lote, cada uno con su código legible).
- Ver reportes (ver §8) y exportar a Excel/CSV.
- Anular boletos o lotes.
- Gestionar usuarios de taquilla (crear cuenta, asignar sede).

### Taquilla (por sede)
- Inicia sesión (usuario/contraseña); su sede queda fijada por su cuenta.
- Pantalla única de escaneo con la cámara del dispositivo.
- Escanea → resultado verde/rojo → si es válido, llena nombre + DNI → confirma.

## 8. Reportes

- **Por empresa:** emitidos / canjeados / pendientes (+ detalle exportable).
- **Por sede.**
- **Por rango de fechas.**
- Exportación a **Excel/CSV** para conservar el formato conocido.

## 9. Autenticación y seguridad

- Contraseñas con hash (bcrypt/argon2).
- Sesiones seguras (cookies httpOnly).
- Rutas de admin protegidas por rol; taquilla solo accede a escaneo y a canjes
  de su propia sede.
- El `token` del QR es la única credencial del boleto; se genera con un CSPRNG.

## 10. Fuera de alcance (fase 2)

- Portal de auto-servicio para que la empresa vea su propio reporte.
- Amarre a película/función específica.
- Venta o pago en línea.
- Notificaciones por correo.

## 11. Criterios de éxito

- Un QR no puede canjearse dos veces (verificado con prueba de concurrencia).
- Un QR falso o vencido se rechaza con mensaje claro.
- Generar un lote de N boletos produce N QR únicos descargables.
- El reporte por empresa cuadra: emitidos = canjeados + pendientes + anulados.
- Taquilla completa un canje válido en pocos toques desde el celular.
