"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { crearProducto, editarProducto, desactivarProducto } from "@/domain/productos";
import { getCurrentUser } from "@/lib/session";

export type ProductoActionResult = { error?: string } | void;

export async function crearProductoAction(formData: FormData): Promise<ProductoActionResult> {
  const u = await getCurrentUser();
  if (!u?.puedeAdmin) redirect("/login");
  const nombre = String(formData.get("nombre") ?? "");
  const detalle = String(formData.get("detalle") ?? "");
  const precio = String(formData.get("precio") ?? "");
  const r = await crearProducto(db, { nombre, detalle, precio });
  if ("error" in r) return { error: r.error };
  revalidatePath("/eventos/productos");
}

export async function editarProductoAction(formData: FormData): Promise<ProductoActionResult> {
  const u = await getCurrentUser();
  if (!u?.puedeAdmin) redirect("/login");
  const id = Number(formData.get("id"));
  if (!id) return { error: "Producto inválido." };
  const nombre = String(formData.get("nombre") ?? "");
  const detalle = String(formData.get("detalle") ?? "");
  const precio = String(formData.get("precio") ?? "");
  const activo = formData.get("activo") === "1";
  const r = await editarProducto(db, id, { nombre, detalle, precio, activo });
  if ("error" in r) return { error: r.error };
  revalidatePath("/eventos/productos");
}

export async function desactivarProductoAction(formData: FormData): Promise<ProductoActionResult> {
  const u = await getCurrentUser();
  if (!u?.puedeAdmin) redirect("/login");
  const id = Number(formData.get("id"));
  if (!id) return { error: "Producto inválido." };
  await desactivarProducto(db, id);
  revalidatePath("/eventos/productos");
}
