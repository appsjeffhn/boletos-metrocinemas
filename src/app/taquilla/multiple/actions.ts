"use server";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { canjearMultiple, type ResultadoCanjeMultiple } from "@/domain/boletos";
import { getCurrentUser } from "@/lib/session";

export type CanjeMultipleState = {
  error?: string;
  resultados?: ResultadoCanjeMultiple[];
  exitosos?: number;
  fallidos?: number;
};

export async function confirmarCanjeMultiple(
  tokens: string[],
  portadorNombre: string,
  portadorDni: string,
): Promise<CanjeMultipleState> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  if (!u.puedeTaquilla || !u.activeSedeId) {
    return { error: "Tu usuario no tiene una sede activa." };
  }

  const nombre = portadorNombre.trim();
  const dni = portadorDni.trim();
  if (!nombre || !dni) {
    return { error: "Nombre y DNI del portador son obligatorios." };
  }

  const unicos = Array.from(new Set(tokens.filter(Boolean)));
  if (unicos.length === 0) {
    return { error: "No hay boletos escaneados." };
  }

  const r = await canjearMultiple(db, unicos, {
    sedeId: u.activeSedeId,
    usuarioId: u.userId,
    portadorNombre: nombre,
    portadorDni: dni,
  });

  return { resultados: r.resultados, exitosos: r.exitosos, fallidos: r.fallidos };
}
