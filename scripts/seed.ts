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
