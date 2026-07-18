"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sedes, usuarios, usuarioSedes } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";

export type UsuarioActionResult = { error?: string } | void;

async function sedesSeleccionadas(formData: FormData): Promise<number[]> {
  const todas = formData.get("todas") === "1";
  if (todas) {
    const filas = await db.select({ id: sedes.id }).from(sedes);
    return filas.map((f) => f.id);
  }
  const ids = formData
    .getAll("sedeIds")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0);
  return Array.from(new Set(ids));
}

export async function crearUsuario(formData: FormData): Promise<UsuarioActionResult> {
  const u = await getCurrentUser();
  if (!u?.puedeAdmin) redirect("/login");

  const usuario = String(formData.get("usuario") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const puedeAdmin = formData.get("puedeAdmin") === "1";
  const puedeTaquilla = formData.get("puedeTaquilla") === "1";

  if (!usuario) return { error: "El usuario es obligatorio." };
  if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };
  if (!puedeAdmin && !puedeTaquilla) {
    return { error: "Elige al menos un acceso (Admin o Taquilla)" };
  }

  const sedeIds = await sedesSeleccionadas(formData);
  if (puedeTaquilla && sedeIds.length === 0) {
    return { error: "Un usuario de taquilla necesita al menos una sucursal" };
  }

  const creados = await db
    .insert(usuarios)
    .values({ usuario, passwordHash: await hashPassword(password), puedeAdmin, puedeTaquilla })
    .onConflictDoNothing()
    .returning({ id: usuarios.id });

  const creado = creados[0];
  if (!creado) return { error: "Ya existe un usuario con ese nombre." };

  if (sedeIds.length > 0) {
    await db.insert(usuarioSedes).values(sedeIds.map((sedeId) => ({ usuarioId: creado.id, sedeId })));
  }

  revalidatePath("/configuracion/usuarios");
}

export async function editarUsuario(formData: FormData): Promise<UsuarioActionResult> {
  const u = await getCurrentUser();
  if (!u?.puedeAdmin) redirect("/login");

  const id = Number(formData.get("id"));
  if (!id) return { error: "Usuario inválido." };

  const usuario = String(formData.get("usuario") ?? "").trim();
  if (!usuario) return { error: "El usuario es obligatorio." };

  const password = String(formData.get("password") ?? "");
  const puedeAdmin = formData.get("puedeAdmin") === "1";
  const puedeTaquilla = formData.get("puedeTaquilla") === "1";

  if (!puedeAdmin && !puedeTaquilla) {
    return { error: "Elige al menos un acceso (Admin o Taquilla)" };
  }

  const sedeIds = await sedesSeleccionadas(formData);
  if (puedeTaquilla && sedeIds.length === 0) {
    return { error: "Un usuario de taquilla necesita al menos una sucursal" };
  }

  const cambios: { usuario: string; puedeAdmin: boolean; puedeTaquilla: boolean; passwordHash?: string } = {
    usuario,
    puedeAdmin,
    puedeTaquilla,
  };
  if (password.trim().length > 0) {
    if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };
    cambios.passwordHash = await hashPassword(password);
  }

  await db.update(usuarios).set(cambios).where(eq(usuarios.id, id));

  await db.delete(usuarioSedes).where(eq(usuarioSedes.usuarioId, id));
  if (sedeIds.length > 0) {
    await db.insert(usuarioSedes).values(sedeIds.map((sedeId) => ({ usuarioId: id, sedeId })));
  }

  revalidatePath("/configuracion/usuarios");
}

export async function toggleUsuarioActivo(formData: FormData): Promise<void> {
  const u = await getCurrentUser();
  if (!u?.puedeAdmin) redirect("/login");

  const id = Number(formData.get("id"));
  if (!id) return;

  const filas = await db.select({ activo: usuarios.activo }).from(usuarios).where(eq(usuarios.id, id));
  const actual = filas[0];
  if (!actual) return;

  await db.update(usuarios).set({ activo: !actual.activo }).where(eq(usuarios.id, id));
  revalidatePath("/configuracion/usuarios");
}
