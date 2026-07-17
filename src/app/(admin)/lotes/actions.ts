"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { anularLote, generarLote } from "@/domain/boletos";
import { getCurrentUser } from "@/lib/session";

export async function crearLoteAction(formData: FormData) {
  const u = await getCurrentUser();
  if (!u || !u.puedeAdmin) redirect("/login");
  const cantidad = Number(formData.get("cantidad"));
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    revalidatePath("/lotes");
    return;
  }
  const { loteId } = await generarLote(db, {
    empresaId: Number(formData.get("empresaId")),
    descripcion: String(formData.get("descripcion") ?? "").trim(),
    cantidad,
    fechaVencimiento: String(formData.get("fechaVencimiento")),
    creadoPor: u.userId,
  });
  revalidatePath("/lotes");
  redirect(`/lotes/${loteId}/imprimir`);
}

export async function anularLoteAction(formData: FormData) {
  const u = await getCurrentUser();
  if (!u || !u.puedeAdmin) redirect("/login");
  const loteId = Number(formData.get("loteId"));
  await anularLote(db, loteId);
  revalidatePath("/lotes");
}
