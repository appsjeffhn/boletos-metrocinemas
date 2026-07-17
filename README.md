# Boletos Metrocinemas

Aplicación web (Next.js App Router + TypeScript) para la emisión y canje de boletos digitales de cine mediante códigos QR. Permite generar lotes de boletos para empresas, imprimir/entregar sus QR, y canjearlos una única vez en taquilla, en cualquier sede.

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

## Scripts

- `npm run dev` — servidor de desarrollo.
- `npm run build` / `npm run start` — build y arranque de producción.
- `npm test` — suite de pruebas (Vitest).
- `npm run db:generate` — genera migraciones de Drizzle a partir del esquema.
- `npm run db:migrate` — aplica migraciones pendientes.
- `npm run db:seed` — crea sedes y usuario admin inicial.
