import { and, eq } from "drizzle-orm";
import type { DrizzleDb } from "@/db/client";
import { lotes, boletos, empresas, sedes } from "@/db/schema";
import { generarCodigo, generarToken } from "@/lib/codigo";

export type NuevoLote = {
  empresaId: number;
  descripcion: string;
  cantidad: number;
  fechaVencimiento: string; // ISO date YYYY-MM-DD
  creadoPor?: number;
};

export async function generarLote(db: DrizzleDb, input: NuevoLote) {
  const [emp] = await db.select({ prefijo: empresas.prefijo })
    .from(empresas).where(eq(empresas.id, input.empresaId));
  if (!emp) throw new Error("Empresa no encontrada");

  const [lote] = await db.insert(lotes).values({
    empresaId: input.empresaId,
    descripcion: input.descripcion,
    cantidad: input.cantidad,
    fechaVencimiento: input.fechaVencimiento,
    creadoPor: input.creadoPor ?? null,
  }).returning();

  const filas = Array.from({ length: input.cantidad }, () => ({
    loteId: lote.id,
    codigo: generarCodigo(emp.prefijo),
    token: generarToken(),
  }));

  try {
    const insertados = await db.insert(boletos).values(filas)
      .returning({ id: boletos.id, codigo: boletos.codigo, token: boletos.token });
    return { loteId: lote.id, boletos: insertados };
  } catch (err) {
    // Nota: el driver neon-http (usado en producción) NO soporta
    // db.transaction() (lanza "No transactions support in neon-http driver"),
    // así que no podemos envolver ambos inserts en una transacción real.
    // Compensamos manualmente: si falla la inserción de boletos, eliminamos
    // el lote recién creado para no dejarlo huérfano.
    await db.delete(lotes).where(eq(lotes.id, lote.id));
    throw err;
  }
}

export async function anularLote(db: DrizzleDb, loteId: number): Promise<{ anulados: number }> {
  const actualizados = await db.update(boletos)
    .set({ estado: "anulado" })
    .where(and(eq(boletos.loteId, loteId), eq(boletos.estado, "activo")))
    .returning({ id: boletos.id });
  return { anulados: actualizados.length };
}

function hoyISO(): string {
  // Fecha calendario en Honduras (UTC-6), no UTC: usar UTC podía marcar un
  // boleto como vencido hasta 6h antes de tiempo el día de su vencimiento.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Tegucigalpa" }).format(new Date());
}

export type BoletoInfo = {
  codigo: string;
  empresa: string;
  estado: "activo" | "canjeado" | "anulado";
  fechaVencimiento: string;
  canje?: { sede: string | null; fecha: Date | null; portadorNombre: string | null };
};

type Razon = "invalido" | "canjeado" | "anulado" | "vencido";

async function cargar(db: DrizzleDb, token: string) {
  const [row] = await db
    .select({
      id: boletos.id, estado: boletos.estado, codigo: boletos.codigo,
      fechaVencimiento: lotes.fechaVencimiento, empresa: empresas.nombre,
      canjeFecha: boletos.canjeFecha, canjePortadorNombre: boletos.canjePortadorNombre,
      canjeSedeNombre: sedes.nombre,
    })
    .from(boletos)
    .innerJoin(lotes, eq(boletos.loteId, lotes.id))
    .innerJoin(empresas, eq(lotes.empresaId, empresas.id))
    .leftJoin(sedes, eq(boletos.canjeSedeId, sedes.id))
    .where(eq(boletos.token, token));
  return row;
}

function aInfo(row: NonNullable<Awaited<ReturnType<typeof cargar>>>): BoletoInfo {
  return {
    codigo: row.codigo, empresa: row.empresa, estado: row.estado,
    fechaVencimiento: row.fechaVencimiento,
    canje: { sede: row.canjeSedeNombre, fecha: row.canjeFecha, portadorNombre: row.canjePortadorNombre },
  };
}

export async function obtenerBoletoPorToken(db: DrizzleDb, token: string, hoy = hoyISO()) {
  const row = await cargar(db, token);
  if (!row) return { ok: false as const, razon: "invalido" as Razon };
  const info = aInfo(row);
  if (row.estado === "canjeado") return { ok: false as const, razon: "canjeado" as Razon, boleto: info };
  if (row.estado === "anulado") return { ok: false as const, razon: "anulado" as Razon, boleto: info };
  if (row.fechaVencimiento < hoy) return { ok: false as const, razon: "vencido" as Razon, boleto: info };
  return { ok: true as const, boleto: info };
}

export type DatosCanje = {
  sedeId: number; portadorNombre: string; portadorDni: string; usuarioId: number;
};

export async function canjearBoleto(db: DrizzleDb, token: string, datos: DatosCanje, hoy = hoyISO()) {
  const previo = await obtenerBoletoPorToken(db, token, hoy);
  if (!previo.ok) return { ok: false as const, razon: previo.razon };

  // Guardia atómica: solo cambia si sigue 'activo'. Un segundo canje concurrente falla aquí.
  const actualizado = await db.update(boletos)
    .set({
      estado: "canjeado", canjeSedeId: datos.sedeId,
      canjePortadorNombre: datos.portadorNombre, canjePortadorDni: datos.portadorDni,
      canjeFecha: new Date(), canjeUsuarioId: datos.usuarioId,
    })
    .where(and(eq(boletos.token, token), eq(boletos.estado, "activo")))
    .returning({ codigo: boletos.codigo });

  if (actualizado.length === 0) return { ok: false as const, razon: "canjeado" as Razon };
  return { ok: true as const, codigo: actualizado[0].codigo };
}
