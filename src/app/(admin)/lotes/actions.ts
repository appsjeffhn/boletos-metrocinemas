"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { sedes } from "@/db/schema";
import {
  anularLote,
  editarLote,
  eliminarLote,
  generarLote,
  editarProductosLote,
  type ProductoLoteInput,
} from "@/domain/boletos";
import { getCurrentUser } from "@/lib/session";

export type LoteActionResult = { error?: string } | void;

function productosDesde(formData: FormData): ProductoLoteInput[] {
  const nombres = formData.getAll("prodNombre").map((v) => String(v));
  const detalles = formData.getAll("prodDetalle").map((v) => String(v));
  const precios = formData.getAll("prodPrecio").map((v) => String(v));
  const cantidades = formData.getAll("prodCantidad").map((v) => String(v));
  const productoIds = formData.getAll("prodProductoId").map((v) => String(v));
  const out: ProductoLoteInput[] = [];
  for (let i = 0; i < nombres.length; i++) {
    const nombre = (nombres[i] ?? "").trim();
    if (!nombre) continue; // ignora filas vacías
    const cantidad = Number(cantidades[i]);
    const pid = Number(productoIds[i]);
    out.push({
      nombre,
      detalle: (detalles[i] ?? "").trim() || null,
      precioUnitario: (precios[i] ?? "").trim() || null,
      cantidadPorBoleto: Number.isInteger(cantidad) && cantidad >= 1 ? cantidad : 1,
      productoId: Number.isInteger(pid) && pid > 0 ? pid : null,
    });
  }
  return out;
}

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
  const productos = productosDesde(formData);

  const { loteId } = await generarLote(db, {
    empresaId,
    descripcion,
    cantidad,
    fechaVencimiento,
    creadoPor: u.userId,
    sedeIds,
    productos,
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

export async function editarLoteAction(formData: FormData): Promise<LoteActionResult> {
  const u = await getCurrentUser();
  if (!u || !u.puedeAdmin) redirect("/login");

  const loteId = Number(formData.get("loteId"));
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const cantidad = Number(formData.get("cantidad"));
  const fechaVencimiento = String(formData.get("fechaVencimiento") ?? "");

  if (!loteId) return { error: "Lote inválido." };
  if (!descripcion) return { error: "La descripción es obligatoria." };
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    return { error: "La cantidad debe ser un entero mayor o igual a 1." };
  }
  if (!fechaVencimiento) return { error: "La fecha de vencimiento es obligatoria." };

  const sedeIds = await sedesSeleccionadas(formData);

  try {
    await editarLote(db, loteId, { descripcion, fechaVencimiento, cantidad, sedeIds });
  } catch (err) {
    if (err instanceof Error && err.message === "No se puede editar un lote con canjes") {
      return { error: "No se puede editar: el lote ya tiene canjes." };
    }
    throw err;
  }
  revalidatePath("/lotes");
  redirect(`/lotes/${loteId}/imprimir`);
}

export async function eliminarLoteAction(formData: FormData): Promise<LoteActionResult> {
  const u = await getCurrentUser();
  if (!u || !u.puedeAdmin) redirect("/login");

  const loteId = Number(formData.get("loteId"));
  if (!loteId) return { error: "Lote inválido." };

  try {
    await eliminarLote(db, loteId);
  } catch (err) {
    if (err instanceof Error && err.message === "No se puede eliminar un lote con canjes") {
      return { error: "No se puede eliminar: el lote ya tiene canjes. Usa Anular." };
    }
    throw err;
  }
  revalidatePath("/lotes");
}

export async function editarProductosLoteAction(formData: FormData): Promise<LoteActionResult> {
  const u = await getCurrentUser();
  if (!u || !u.puedeAdmin) redirect("/login");

  const loteId = Number(formData.get("loteId"));
  if (!loteId) return { error: "Lote inválido." };

  const productos = productosDesde(formData);
  const r = await editarProductosLote(db, loteId, productos);
  if ("error" in r) return { error: r.error };
  revalidatePath("/lotes");
}
