import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { DrizzleDb } from "@/db/client";
import { boletos, empresas, lotes, sedes } from "@/db/schema";

function hoyISO(): string {
  // Misma lógica que src/domain/boletos.ts: fecha calendario en Honduras
  // (America/Tegucigalpa), no UTC.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Tegucigalpa" }).format(new Date());
}

function fechaISOTegucigalpa(fecha: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Tegucigalpa" }).format(fecha);
}

export type DashboardKpis = {
  empresas: number;
  lotesActivos: number;
  boletosEmitidos: number;
  boletosCanjeados: number;
  boletosPendientes: number;
  boletosAnulados: number;
  canjesHoy: number;
  canjesPorSede: { sede: string; canjeados: number }[];
  ultimosCanjes: {
    codigo: string;
    empresa: string;
    sede: string | null;
    portadorNombre: string | null;
    fecha: Date | null;
  }[];
};

export async function dashboardKpis(db: DrizzleDb): Promise<DashboardKpis> {
  const [{ count: totalEmpresas }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(empresas);

  const [{ count: lotesActivos }] = await db
    .select({ count: sql<number>`count(distinct ${lotes.id})::int` })
    .from(lotes)
    .innerJoin(boletos, and(eq(boletos.loteId, lotes.id), eq(boletos.estado, "activo")))
    .where(isNull(lotes.anuladoEn));

  const [conteos] = await db
    .select({
      emitidos: sql<number>`count(*)::int`,
      canjeados: sql<number>`count(*) filter (where ${boletos.estado} = 'canjeado')::int`,
      pendientes: sql<number>`count(*) filter (where ${boletos.estado} = 'activo')::int`,
      anulados: sql<number>`count(*) filter (where ${boletos.estado} = 'anulado')::int`,
    })
    .from(boletos);

  const canjeadosFechas = await db
    .select({ fecha: boletos.canjeFecha })
    .from(boletos)
    .where(eq(boletos.estado, "canjeado"));
  const hoy = hoyISO();
  const canjesHoy = canjeadosFechas.filter(
    (r) => r.fecha && fechaISOTegucigalpa(r.fecha) === hoy,
  ).length;

  const canjesPorSede = await db
    .select({ sede: sedes.nombre, canjeados: sql<number>`count(*)::int` })
    .from(boletos)
    .innerJoin(sedes, eq(boletos.canjeSedeId, sedes.id))
    .where(eq(boletos.estado, "canjeado"))
    .groupBy(sedes.nombre)
    .orderBy(sedes.nombre);

  const ultimosCanjes = await db
    .select({
      codigo: boletos.codigo,
      empresa: empresas.nombre,
      sede: sedes.nombre,
      portadorNombre: boletos.canjePortadorNombre,
      fecha: boletos.canjeFecha,
    })
    .from(boletos)
    .innerJoin(lotes, eq(boletos.loteId, lotes.id))
    .innerJoin(empresas, eq(lotes.empresaId, empresas.id))
    .leftJoin(sedes, eq(boletos.canjeSedeId, sedes.id))
    .where(eq(boletos.estado, "canjeado"))
    .orderBy(desc(boletos.canjeFecha))
    .limit(10);

  return {
    empresas: totalEmpresas,
    lotesActivos,
    boletosEmitidos: conteos.emitidos,
    boletosCanjeados: conteos.canjeados,
    boletosPendientes: conteos.pendientes,
    boletosAnulados: conteos.anulados,
    canjesHoy,
    canjesPorSede,
    ultimosCanjes,
  };
}
