"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { empresas } from "@/db/schema";
import { normalizarPrefijo } from "@/lib/codigo";
import { getCurrentUser } from "@/lib/session";
import { empresaTieneLotesActivos } from "@/domain/empresasQuery";

export type EmpresaActionResult = { error?: string } | void;

export async function crearEmpresa(formData: FormData): Promise<void> {
  const u = await getCurrentUser();
  if (!u?.puedeAdmin) redirect("/login");

  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return;
  const prefijoRaw = String(formData.get("prefijo") ?? "").trim();
  const prefijo = normalizarPrefijo(prefijoRaw || nombre);
  const contacto = String(formData.get("contacto") ?? "").trim() || null;
  const telefono = String(formData.get("telefono") ?? "").trim() || null;

  await db
    .insert(empresas)
    .values({ nombre, prefijo, contacto, telefono })
    .onConflictDoNothing();

  revalidatePath("/empresas");
}

export async function editarEmpresa(formData: FormData): Promise<EmpresaActionResult> {
  const u = await getCurrentUser();
  if (!u?.puedeAdmin) redirect("/login");

  const id = Number(formData.get("id"));
  if (!id) return { error: "Empresa inválida." };

  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return { error: "El nombre es obligatorio." };
  const prefijoRaw = String(formData.get("prefijo") ?? "").trim();
  const prefijo = normalizarPrefijo(prefijoRaw || nombre);
  const contacto = String(formData.get("contacto") ?? "").trim() || null;
  const telefono = String(formData.get("telefono") ?? "").trim() || null;

  await db
    .update(empresas)
    .set({ nombre, prefijo, contacto, telefono })
    .where(eq(empresas.id, id));

  revalidatePath("/empresas");
}

export async function eliminarEmpresa(formData: FormData): Promise<EmpresaActionResult> {
  const u = await getCurrentUser();
  if (!u?.puedeAdmin) redirect("/login");

  const id = Number(formData.get("id"));
  if (!id) return { error: "Empresa inválida." };

  const tieneLotesActivos = await empresaTieneLotesActivos(db, id);
  if (tieneLotesActivos) {
    return { error: "No se puede eliminar: la empresa tiene lotes activos." };
  }

  await db.delete(empresas).where(eq(empresas.id, id));
  revalidatePath("/empresas");
}
