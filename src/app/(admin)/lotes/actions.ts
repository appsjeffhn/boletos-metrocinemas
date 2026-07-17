"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { generarLote } from "@/domain/boletos";
import { getCurrentUser } from "@/lib/session";

export async function crearLoteAction(formData: FormData) {
  const u = await getCurrentUser();
  if (!u || u.rol !== "admin") redirect("/login");
  const { loteId } = await generarLote(db, {
    empresaId: Number(formData.get("empresaId")),
    descripcion: String(formData.get("descripcion") ?? "").trim(),
    cantidad: Number(formData.get("cantidad")),
    fechaVencimiento: String(formData.get("fechaVencimiento")),
    creadoPor: u.userId,
  });
  revalidatePath("/lotes");
  redirect(`/lotes/${loteId}/imprimir`);
}
