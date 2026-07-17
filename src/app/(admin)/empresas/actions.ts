"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { empresas } from "@/db/schema";
import { normalizarPrefijo } from "@/lib/codigo";
import { getCurrentUser } from "@/lib/session";

export async function crearEmpresa(formData: FormData) {
  const u = await getCurrentUser();
  if (!u || u.rol !== "admin") redirect("/login");
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return;
  const prefijoRaw = String(formData.get("prefijo") ?? "").trim();
  const prefijo = normalizarPrefijo(prefijoRaw || nombre);
  await db.insert(empresas).values({
    nombre,
    prefijo,
    contacto: String(formData.get("contacto") ?? "") || null,
    notas: String(formData.get("notas") ?? "") || null,
  }).onConflictDoNothing();
  revalidatePath("/empresas");
}
