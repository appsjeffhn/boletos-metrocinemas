"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { usuarios } from "@/db/schema";
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
  // TODO(v2): reemplazar por puedeAdmin/puedeTaquilla cuando el login se actualice (fuera de alcance de esta tarea de esquema).
  const token = await signSession({ userId: u.id, rol: u.rol as "admin" | "taquilla", sedeId: u.sedeId });
  await setSessionCookie(token);
  redirect(u.rol === "admin" ? "/reportes" : "/taquilla");
}
