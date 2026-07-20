import Link from "next/link";
import { db } from "@/db/client";
import { sedes as sedesTable } from "@/db/schema";
import { listarEmpresas } from "@/domain/empresasQuery";
import { resumenProductos, detalleCanjesProductos } from "@/domain/reportesProductos";
import { zonaHoraria } from "@/domain/configuracion";
import { fechaHoraEn } from "@/lib/fechas";
import { Card } from "@/components/ui/Card";
import { Table, Th, Td } from "@/components/ui/Table";

function money(n: number): string {
  return `L.${n.toFixed(2)}`;
}

export default async function ReporteProductosPage(
  { searchParams }: { searchParams: Promise<Record<string, string | undefined>> },
) {
  const sp = await searchParams;
  const empresaId = sp.empresaId ? Number(sp.empresaId) : undefined;
  const sedeId = sp.sedeId ? Number(sp.sedeId) : undefined;
  const desde = sp.desde || undefined;
  const hasta = sp.hasta || undefined;

  const [empresas, sedes, resumen, detalle, tz] = await Promise.all([
    listarEmpresas(db),
    db.select({ id: sedesTable.id, nombre: sedesTable.nombre }).from(sedesTable).orderBy(sedesTable.nombre),
    resumenProductos(db, { empresaId }),
    detalleCanjesProductos(db, { empresaId, sedeId, desde, hasta }),
    zonaHoraria(db),
  ]);

  const qs = new URLSearchParams(
    Object.entries({ empresaId, sedeId, desde, hasta })
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => [k, String(v)]),
  ).toString();

  return (
    <section className="space-y-6">
      <h1 className="text-[28px] leading-8">Reporte de items</h1>

      <Card>
        <form method="get" className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Empresa</span>
            <select name="empresaId" defaultValue={empresaId ?? ""} className="input">
              <option value="">Todas</option>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Sede (detalle)</span>
            <select name="sedeId" defaultValue={sedeId ?? ""} className="input">
              <option value="">Todas</option>
              {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Desde (detalle)</span>
            <input type="date" name="desde" defaultValue={desde ?? ""} className="input" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Hasta (detalle)</span>
            <input type="date" name="hasta" defaultValue={hasta ?? ""} className="input" />
          </label>
          <button type="submit" className="btn btn-primary">Filtrar</button>
        </form>
        <p className="text-xs mt-2" style={{ color: "var(--black-60)" }}>
          Los filtros de fecha y sede aplican al detalle de canjes. El resumen refleja totales de por vida por empresa.
        </p>
      </Card>

      <Card>
        <h2 className="text-base font-semibold mb-4">Resumen por producto</h2>
        <Table>
          <thead>
            <tr>
              <Th>Producto</Th><Th>Creados</Th><Th>Canjeados</Th><Th>Pendientes</Th>
              <Th>Valor creado</Th><Th>Valor canjeado</Th><Th>Valor pendiente</Th>
            </tr>
          </thead>
          <tbody>
            {resumen.length === 0 && (
              <tr><Td colSpan={7} className="text-center text-[var(--black-60)]">Sin datos.</Td></tr>
            )}
            {resumen.map((r) => (
              <tr key={`${r.productoId ?? "adhoc"}-${r.nombre}`}>
                <Td className="font-semibold">{r.nombre}</Td>
                <Td>{r.creados}</Td>
                <Td>{r.canjeados}</Td>
                <Td>{r.pendientes}</Td>
                <Td>{money(r.montoCreado)}</Td>
                <Td>{money(r.montoCanjeado)}</Td>
                <Td>{money(r.montoPendiente)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Detalle de canjes</h2>
          <a className="btn btn-secondary btn-sm" href={`/reportes/productos/exportar${qs ? `?${qs}` : ""}`}>
            Exportar CSV
          </a>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Producto</Th><Th>Empresa</Th><Th>Sede</Th><Th>Código</Th>
              <Th>Cant.</Th><Th>Importe</Th><Th>Operador</Th><Th>Fecha</Th>
            </tr>
          </thead>
          <tbody>
            {detalle.length === 0 && (
              <tr><Td colSpan={8} className="text-center text-[var(--black-60)]">Sin canjes en el rango.</Td></tr>
            )}
            {detalle.map((d, i) => (
              <tr key={i}>
                <Td className="font-semibold">{d.producto}</Td>
                <Td>{d.empresa}</Td>
                <Td>{d.sede ?? "—"}</Td>
                <Td className="font-mono">{d.codigo}</Td>
                <Td>{d.cantidad}</Td>
                <Td>{d.importe == null ? "—" : money(d.importe)}</Td>
                <Td>{d.operador ?? "—"}</Td>
                <Td>{d.fecha ? fechaHoraEn(new Date(d.fecha), tz) : "—"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Link href="/reportes" className="text-sm" style={{ color: "var(--blue-hover)" }}>← Volver a Reportes</Link>
    </section>
  );
}
