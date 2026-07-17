"use server";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { canjearBoleto } from "@/domain/boletos";
import { getCurrentUser } from "@/lib/session";

export type CanjeState = { error?: string; ok?: true; codigo?: string };

export async function confirmarCanje(
  token: string,
  _prev: CanjeState,
  formData: FormData,
): Promise<CanjeState> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  if (!u.activeSedeId) return { error: "Tu usuario no tiene sede asignada." };

  const r = await canjearBoleto(db, token, {
    sedeId: u.activeSedeId,
    usuarioId: u.userId,
    portadorNombre: String(formData.get("portadorNombre") ?? "").trim(),
    portadorDni: String(formData.get("portadorDni") ?? "").trim(),
  });
  if (!r.ok) {
    const msg = { invalido: "Boleto inválido o falso", canjeado: "Este boleto ya fue canjeado",
      anulado: "Boleto anulado", vencido: "Boleto vencido" }[r.razon];
    return { error: msg };
  }
  return { ok: true, codigo: r.codigo };
}
