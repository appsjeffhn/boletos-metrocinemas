"use server";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { canjearMultiple, obtenerBoletoPorToken, type ResultadoCanjeMultiple } from "@/domain/boletos";
import { productosPorToken } from "@/domain/loteProductosQuery";
import type { ProductoBoleto } from "@/domain/totalizar";
import { getCurrentUser } from "@/lib/session";
import { hoyISOEn } from "@/lib/fechas";
import { zonaHoraria } from "@/domain/configuracion";

export type CanjeInfo = {
  sede: string | null;
  operador: string | null;
  portadorNombre: string | null;
  portadorDni: string | null;
  fecha: string | null;
};

export type InfoBoleto = {
  token: string;
  codigo: string | null;
  estado: "valido" | "canjeado" | "anulado" | "vencido" | "invalido";
  canje?: CanjeInfo;
  productos: ProductoBoleto[];
};

function razonAEstado(razon: string): InfoBoleto["estado"] {
  if (razon === "canjeado") return "canjeado";
  if (razon === "anulado") return "anulado";
  if (razon === "vencido") return "vencido";
  return "invalido";
}

// Consulta el estado y los datos de un boleto por su token (para mostrar el
// código legible y, si ya fue canjeado, los datos del canje).
export async function infoBoleto(token: string): Promise<InfoBoleto> {
  const u = await getCurrentUser();
  if (!u?.puedeTaquilla) return { token, codigo: null, estado: "invalido", productos: [] };

  const hoy = hoyISOEn(await zonaHoraria(db));
  const r = await obtenerBoletoPorToken(db, token, hoy);
  const prods = await productosPorToken(db, token);
  const productos: ProductoBoleto[] = prods.map((p) => ({ nombre: p.nombre, cantidadPorBoleto: p.cantidadPorBoleto }));
  if (r.ok) return { token, codigo: r.boleto.codigo, estado: "valido", productos };

  const c = r.boleto?.canje;
  return {
    token,
    codigo: r.boleto?.codigo ?? null,
    estado: razonAEstado(r.razon),
    productos,
    canje: c
      ? {
          sede: c.sede,
          operador: c.operador,
          portadorNombre: c.portadorNombre,
          portadorDni: c.portadorDni,
          fecha: c.fecha ? new Date(c.fecha).toISOString() : null,
        }
      : undefined,
  };
}

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

  const hoy = hoyISOEn(await zonaHoraria(db));
  const r = await canjearMultiple(db, unicos, {
    sedeId: u.activeSedeId,
    usuarioId: u.userId,
    portadorNombre: nombre,
    portadorDni: dni,
  }, hoy);

  return { resultados: r.resultados, exitosos: r.exitosos, fallidos: r.fallidos };
}
