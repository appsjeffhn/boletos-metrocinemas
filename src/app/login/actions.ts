"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sedes, usuarios, usuarioSedes } from "@/db/schema";
import { verifyPassword, signSession } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";

export async function iniciarSesion(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const usuario = String(formData.get("usuario") ?? "");
  const password = String(formData.get("password") ?? "");

  const [u] = await db.select().from(usuarios).where(eq(usuarios.usuario, usuario));
  if (!u || !u.activo || !(await verifyPassword(password, u.passwordHash))) {
    return { error: "Usuario o contraseña incorrectos" };
  }

  const puedeAdmin = u.puedeAdmin;
  const puedeTaquilla = u.puedeTaquilla;
  if (!puedeAdmin && !puedeTaquilla) {
    return { error: "Tu usuario no tiene accesos asignados" };
  }

  const filasSedes = await db
    .select({ sedeId: usuarioSedes.sedeId, activo: sedes.activo })
    .from(usuarioSedes)
    .innerJoin(sedes, eq(sedes.id, usuarioSedes.sedeId))
    .where(eq(usuarioSedes.usuarioId, u.id));
  const sedeIds = filasSedes.map((f) => f.sedeId);
  // Solo las sedes activas cuentan para elegir/asignar la sede de trabajo:
  // una sede desactivada no debe poder usarse para canjear.
  const sedeIdsActivas = filasSedes.filter((f) => f.activo).map((f) => f.sedeId);

  const activeSedeId = puedeTaquilla && sedeIdsActivas.length === 1 ? sedeIdsActivas[0] : null;

  const token = await signSession({ userId: u.id, puedeAdmin, puedeTaquilla, sedeIds, activeSedeId });
  await setSessionCookie(token);

  if (puedeAdmin) redirect("/dashboard");
  if (sedeIdsActivas.length > 1) redirect("/elegir-sede");
  redirect("/taquilla");
}
