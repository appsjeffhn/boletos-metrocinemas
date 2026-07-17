import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { DrizzleDb } from "@/db/client";
import { lotes, boletos, empresas, sedes, usuarios, loteSedes, loteProductos } from "@/db/schema";
import { generarCodigo, generarToken } from "@/lib/codigo";

export type NuevoLote = {
  empresaId: number;
  descripcion: string;
  cantidad: number;
  fechaVencimiento: string; // ISO date YYYY-MM-DD
  creadoPor?: number;
  /** Complejos (sedes) donde el lote es válido. Vacío/omitido = válido en todas. */
  sedeIds?: number[];
  /** Productos que aplican al lote (modelo bundle: cada boleto vale por todos). */
  productos?: ProductoLoteInput[];
};

export type ProductoLoteInput = {
  productoId?: number | null;
  nombre: string;
  detalle?: string | null;
  precioUnitario?: string | null;
  cantidadPorBoleto: number;
};

function filasLoteProductos(loteId: number, productos: ProductoLoteInput[]) {
  return productos.map((p, i) => ({
    loteId,
    productoId: p.productoId ?? null,
    nombre: p.nombre.trim(),
    detalle: p.detalle?.trim() || null,
    precioUnitario: p.precioUnitario ?? null,
    cantidadPorBoleto: p.cantidadPorBoleto,
    orden: i,
  }));
}

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

  let insertados;
  try {
    insertados = await db.insert(boletos).values(filas)
      .returning({ id: boletos.id, codigo: boletos.codigo, token: boletos.token });
  } catch (err) {
    // Nota: el driver neon-http (usado en producción) NO soporta
    // db.transaction() (lanza "No transactions support in neon-http driver"),
    // así que no podemos envolver ambos inserts en una transacción real.
    // Compensamos manualmente: si falla la inserción de boletos, eliminamos
    // el lote recién creado para no dejarlo huérfano.
    await db.delete(lotes).where(eq(lotes.id, lote.id));
    throw err;
  }

  const sedeIds = Array.from(new Set(input.sedeIds ?? []));
  if (sedeIds.length > 0) {
    try {
      await db.insert(loteSedes).values(sedeIds.map((sedeId) => ({ loteId: lote.id, sedeId })));
    } catch (err) {
      // Misma lógica de compensación: si falla la asignación de sedes,
      // revertimos boletos y lote para no dejar huérfanos ni loteSedes sueltos.
      await db.delete(boletos).where(eq(boletos.loteId, lote.id));
      await db.delete(lotes).where(eq(lotes.id, lote.id));
      throw err;
    }
  }

  const prods = input.productos ?? [];
  if (prods.length > 0) {
    try {
      await db.insert(loteProductos).values(filasLoteProductos(lote.id, prods));
    } catch (err) {
      // Compensación (neon-http sin transacciones): revertir sedes, boletos y lote.
      await db.delete(loteSedes).where(eq(loteSedes.loteId, lote.id));
      await db.delete(boletos).where(eq(boletos.loteId, lote.id));
      await db.delete(lotes).where(eq(lotes.id, lote.id));
      throw err;
    }
  }

  return { loteId: lote.id, boletos: insertados };
}

export async function loteTieneCanjes(db: DrizzleDb, loteId: number): Promise<boolean> {
  const [row] = await db.select({ id: boletos.id })
    .from(boletos)
    .where(and(eq(boletos.loteId, loteId), eq(boletos.estado, "canjeado")))
    .limit(1);
  return !!row;
}

export async function editarProductosLote(
  db: DrizzleDb,
  loteId: number,
  productos: ProductoLoteInput[],
): Promise<{ ok: true } | { error: string }> {
  if (await loteTieneCanjes(db, loteId)) {
    return { error: "No se puede editar productos de un lote con canjes." };
  }
  const previos = await db.select().from(loteProductos).where(eq(loteProductos.loteId, loteId));
  await db.delete(loteProductos).where(eq(loteProductos.loteId, loteId));
  if (productos.length > 0) {
    try {
      await db.insert(loteProductos).values(filasLoteProductos(loteId, productos));
    } catch (err) {
      // Compensación (neon-http sin transacciones): si el insert falla, el lote
      // quedaría sin productos; restauramos los previos antes de propagar el error.
      await db.delete(loteProductos).where(eq(loteProductos.loteId, loteId));
      if (previos.length > 0) {
        await db.insert(loteProductos).values(
          previos.map(({ id, creadoEn, ...rest }) => rest),
        );
      }
      throw err;
    }
  }
  return { ok: true };
}

export type EditarLoteInput = {
  descripcion: string;
  fechaVencimiento: string; // ISO date YYYY-MM-DD
  cantidad: number;
  /** Complejos (sedes) donde el lote es válido. Vacío/omitido = válido en todas. */
  sedeIds?: number[];
};

/**
 * Edita un lote sin canjes: actualiza descripcion/fechaVencimiento/sedes y
 * REGENERA todos sus boletos (nuevos códigos y tokens). Esto invalida
 * cualquier QR ya impreso/entregado del lote; la UI debe advertir al usuario.
 */
export async function editarLote(db: DrizzleDb, loteId: number, input: EditarLoteInput) {
  if (await loteTieneCanjes(db, loteId)) {
    throw new Error("No se puede editar un lote con canjes");
  }

  const [lote] = await db.select({ empresaId: lotes.empresaId })
    .from(lotes).where(eq(lotes.id, loteId));
  if (!lote) throw new Error("Lote no encontrado");
  const [emp] = await db.select({ prefijo: empresas.prefijo })
    .from(empresas).where(eq(empresas.id, lote.empresaId));
  if (!emp) throw new Error("Empresa no encontrada");

  await db.update(lotes)
    .set({
      descripcion: input.descripcion,
      fechaVencimiento: input.fechaVencimiento,
      cantidad: input.cantidad,
    })
    .where(eq(lotes.id, loteId));

  await db.delete(loteSedes).where(eq(loteSedes.loteId, loteId));
  const sedeIds = Array.from(new Set(input.sedeIds ?? []));
  if (sedeIds.length > 0) {
    await db.insert(loteSedes).values(sedeIds.map((sedeId) => ({ loteId, sedeId })));
  }

  await db.delete(boletos).where(eq(boletos.loteId, loteId));
  const filas = Array.from({ length: input.cantidad }, () => ({
    loteId,
    codigo: generarCodigo(emp.prefijo),
    token: generarToken(),
  }));
  const insertados = await db.insert(boletos).values(filas)
    .returning({ id: boletos.id, codigo: boletos.codigo, token: boletos.token });

  return { loteId, boletos: insertados };
}

export async function eliminarLote(db: DrizzleDb, loteId: number): Promise<{ ok: true }> {
  if (await loteTieneCanjes(db, loteId)) {
    throw new Error("No se puede eliminar un lote con canjes");
  }
  await db.delete(loteSedes).where(eq(loteSedes.loteId, loteId));
  await db.delete(boletos).where(eq(boletos.loteId, loteId));
  await db.delete(lotes).where(eq(lotes.id, loteId));
  return { ok: true };
}

export async function anularLote(
  db: DrizzleDb,
  loteId: number,
  opts: { motivo: string; usuarioId: number },
): Promise<{ anulados: number }> {
  const motivo = opts.motivo.trim();
  if (!motivo) throw new Error("Motivo requerido");

  await db.update(lotes)
    .set({ anuladoEn: new Date(), anuladoMotivo: motivo, anuladoPor: opts.usuarioId })
    .where(eq(lotes.id, loteId));

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
  canje?: {
    sede: string | null;
    fecha: Date | null;
    portadorNombre: string | null;
    portadorDni: string | null;
    operador: string | null;
  };
};

type Razon = "invalido" | "canjeado" | "anulado" | "vencido" | "sede_no_valida";

const operadores = alias(usuarios, "operadores");

async function cargar(db: DrizzleDb, token: string) {
  const [row] = await db
    .select({
      id: boletos.id, loteId: boletos.loteId, estado: boletos.estado, codigo: boletos.codigo,
      fechaVencimiento: lotes.fechaVencimiento, empresa: empresas.nombre,
      canjeFecha: boletos.canjeFecha, canjePortadorNombre: boletos.canjePortadorNombre,
      canjePortadorDni: boletos.canjePortadorDni,
      canjeSedeNombre: sedes.nombre,
      canjeOperador: operadores.usuario,
    })
    .from(boletos)
    .innerJoin(lotes, eq(boletos.loteId, lotes.id))
    .innerJoin(empresas, eq(lotes.empresaId, empresas.id))
    .leftJoin(sedes, eq(boletos.canjeSedeId, sedes.id))
    .leftJoin(operadores, eq(boletos.canjeUsuarioId, operadores.id))
    .where(eq(boletos.token, token));
  return row;
}

function aInfo(row: NonNullable<Awaited<ReturnType<typeof cargar>>>): BoletoInfo {
  return {
    codigo: row.codigo, empresa: row.empresa, estado: row.estado,
    fechaVencimiento: row.fechaVencimiento,
    canje: {
      sede: row.canjeSedeNombre, fecha: row.canjeFecha,
      portadorNombre: row.canjePortadorNombre, portadorDni: row.canjePortadorDni,
      operador: row.canjeOperador,
    },
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

  // Restricción de sede: si el lote tiene sedes asignadas, la sede activa
  // del operador debe estar entre ellas. Sin sedes asignadas = válido en todas
  // (compatibilidad con lotes creados antes de esta restricción).
  const [{ loteId }] = await db.select({ loteId: boletos.loteId })
    .from(boletos).where(eq(boletos.token, token));
  const sedesDelLote = await db.select({ sedeId: loteSedes.sedeId })
    .from(loteSedes).where(eq(loteSedes.loteId, loteId));
  if (sedesDelLote.length > 0 && !sedesDelLote.some((s) => s.sedeId === datos.sedeId)) {
    return { ok: false as const, razon: "sede_no_valida" as Razon };
  }

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

export type ResultadoCanjeMultiple = {
  token: string;
  codigo?: string;
  ok: boolean;
  razon?: Razon;
};

/** Canjea varios tokens con los mismos datos (sede/usuario/portador). Deduplica tokens y preserva el orden. */
export async function canjearMultiple(
  db: DrizzleDb,
  tokens: string[],
  datos: DatosCanje,
  hoy = hoyISO(),
): Promise<{ resultados: ResultadoCanjeMultiple[]; exitosos: number; fallidos: number }> {
  const unicos = Array.from(new Set(tokens));
  const resultados: ResultadoCanjeMultiple[] = [];
  let exitosos = 0;
  let fallidos = 0;

  for (const token of unicos) {
    const r = await canjearBoleto(db, token, datos, hoy);
    if (r.ok) {
      resultados.push({ token, codigo: r.codigo, ok: true });
      exitosos++;
    } else {
      resultados.push({ token, ok: false, razon: r.razon });
      fallidos++;
    }
  }

  return { resultados, exitosos, fallidos };
}
