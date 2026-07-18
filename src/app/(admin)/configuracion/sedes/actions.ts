"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { crearSede, editarSede, toggleSedeActiva } from "@/domain/sedes";
import { getCurrentUser } from "@/lib/session";

export type SedeActionResult = { error?: string } | void;

export async function crearSedeAction(formData: FormData): Promise<SedeActionResult> {
  const u = await getCurrentUser();
  if (!u?.puedeAdmin) redirect("/login");
  const r = await crearSede(db, String(formData.get("nombre") ?? ""));
  if ("error" in r) return { error: r.error };
  revalidatePath("/configuracion/sedes");
}

export async function editarSedeAction(formData: FormData): Promise<SedeActionResult> {
  const u = await getCurrentUser();
  if (!u?.puedeAdmin) redirect("/login");
  const id = Number(formData.get("id"));
  if (!id) return { error: "Sede inválida." };
  const r = await editarSede(db, id, String(formData.get("nombre") ?? ""));
  if ("error" in r) return { error: r.error };
  revalidatePath("/configuracion/sedes");
}

export async function toggleSedeActivaAction(formData: FormData): Promise<SedeActionResult> {
  const u = await getCurrentUser();
  if (!u?.puedeAdmin) redirect("/login");
  const id = Number(formData.get("id"));
  if (!id) return { error: "Sede inválida." };
  await toggleSedeActiva(db, id);
  revalidatePath("/configuracion/sedes");
}
