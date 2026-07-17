import "dotenv/config";
import { db } from "@/db/client";
import { sedes, usuarios, usuarioSedes } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

const SEDES = [
  "NOVACENTRO", "PLAZA AMERICA", "PLAZA MIRAFLORES", "MEGAMALL",
  "DANLI", "SANTA ROSA DE COPAN", "PUERTO CORTES",
];

async function main() {
  // 1) Sedes (idempotente)
  for (const nombre of SEDES) {
    await db.insert(sedes).values({ nombre }).onConflictDoNothing();
  }

  // 2) Admin inicial (solo si no existe), con capacidad admin
  const adminUser = process.env.ADMIN_USER ?? "admin";
  const adminPass = process.env.ADMIN_PASS ?? "cambiar123";
  const existe = await db.select().from(usuarios).where(eq(usuarios.usuario, adminUser));
  if (existe.length === 0) {
    await db.insert(usuarios).values({
      usuario: adminUser,
      passwordHash: await hashPassword(adminPass),
      puedeAdmin: true,
      puedeTaquilla: false,
    });
    console.log(`Admin creado: ${adminUser}`);
  } else {
    console.log("Admin ya existe, no se recrea.");
  }

  // 3) Backfill para bases creadas antes de v2: derivar capacidades del rol legado
  //    y poblar usuario_sedes desde el sede_id legado. Idempotente.
  await db.execute(sql`UPDATE usuarios SET puede_admin = true WHERE rol = 'admin' AND puede_admin = false`);
  await db.execute(sql`UPDATE usuarios SET puede_taquilla = true WHERE rol = 'taquilla' AND puede_taquilla = false`);
  await db.execute(sql`
    INSERT INTO usuario_sedes (usuario_id, sede_id)
    SELECT id, sede_id FROM usuarios WHERE sede_id IS NOT NULL
    ON CONFLICT DO NOTHING`);

  console.log("Seed completo.");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
