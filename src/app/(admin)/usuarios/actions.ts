"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { usuarios } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";

export async function crearUsuario(formData: FormData) {
  const u = await getCurrentUser();
  if (!u || !u.puedeAdmin) redirect("/login");
  const usuario = String(formData.get("usuario") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const rol = String(formData.get("rol")) === "admin" ? "admin" : "taquilla";
  const sedeId = rol === "taquilla" ? Number(formData.get("sedeId")) : null;
  if (!usuario || password.length < 6) return;
  await db.insert(usuarios).values({
    usuario, passwordHash: await hashPassword(password), rol, sedeId,
  }).onConflictDoNothing();
  revalidatePath("/usuarios");
}
