"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { sedes } from "@/db/schema";
import { anularLote, generarLote } from "@/domain/boletos";
import { getCurrentUser } from "@/lib/session";

export type LoteActionResult = { error?: string } | void;

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

export async function crearLoteAction(formData: FormData): Promise<LoteActionResult> {
  const u = await getCurrentUser();
  if (!u || !u.puedeAdmin) redirect("/login");

  const empresaId = Number(formData.get("empresaId"));
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const cantidad = Number(formData.get("cantidad"));
  const fechaVencimiento = String(formData.get("fechaVencimiento") ?? "");

  if (!empresaId) return { error: "Selecciona una empresa." };
  if (!descripcion) return { error: "La descripción es obligatoria." };
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    return { error: "La cantidad debe ser un entero mayor o igual a 1." };
  }
  if (!fechaVencimiento) return { error: "La fecha de vencimiento es obligatoria." };

  const sedeIds = await sedesSeleccionadas(formData);

  const { loteId } = await generarLote(db, {
    empresaId,
    descripcion,
    cantidad,
    fechaVencimiento,
    creadoPor: u.userId,
    sedeIds,
  });
  revalidatePath("/lotes");
  redirect(`/lotes/${loteId}/imprimir`);
}

export async function anularLoteAction(formData: FormData): Promise<LoteActionResult> {
  const u = await getCurrentUser();
  if (!u || !u.puedeAdmin) redirect("/login");

  const loteId = Number(formData.get("loteId"));
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!loteId) return { error: "Lote inválido." };
  if (!motivo) return { error: "El motivo de anulación es obligatorio." };

  await anularLote(db, loteId, { motivo, usuarioId: u.userId });
  revalidatePath("/lotes");
}
