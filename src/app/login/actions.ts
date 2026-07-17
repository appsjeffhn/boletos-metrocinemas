"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { usuarios, usuarioSedes } from "@/db/schema";
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
    .select({ sedeId: usuarioSedes.sedeId })
    .from(usuarioSedes)
    .where(eq(usuarioSedes.usuarioId, u.id));
  const sedeIds = filasSedes.map((f) => f.sedeId);

  const activeSedeId = puedeTaquilla && sedeIds.length === 1 ? sedeIds[0] : null;

  const token = await signSession({ userId: u.id, puedeAdmin, puedeTaquilla, sedeIds, activeSedeId });
  await setSessionCookie(token);

  if (puedeAdmin) redirect("/dashboard");
  if (sedeIds.length > 1) redirect("/elegir-sede");
  redirect("/taquilla");
}
