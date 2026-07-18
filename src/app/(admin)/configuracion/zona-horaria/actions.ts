"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { guardarZonaHoraria } from "@/domain/configuracion";
import { getCurrentUser } from "@/lib/session";

export type ZonaActionResult = { error?: string; ok?: boolean };

export async function guardarZonaAction(_prev: ZonaActionResult, formData: FormData): Promise<ZonaActionResult> {
  const u = await getCurrentUser();
  if (!u?.puedeAdmin) redirect("/login");
  const tz = String(formData.get("zonaHoraria") ?? "");
  const r = await guardarZonaHoraria(db, tz);
  if ("error" in r) return { error: r.error };
  revalidatePath("/configuracion/zona-horaria");
  revalidatePath("/dashboard");
  return { ok: true };
}
