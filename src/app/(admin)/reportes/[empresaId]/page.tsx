import Link from "next/link";
import { db } from "@/db/client";
import { detalleEmpresa } from "@/domain/reportes";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, Th, Td } from "@/components/ui/Table";

export default async function ReporteEmpresaPage({
  params,
}: {
  params: Promise<{ empresaId: string }>;
}) {
  const { empresaId } = await params;
  const d = await detalleEmpresa(db, Number(empresaId));

  if (!d) {
    return (
      <section className="space-y-6">
        <Link href="/reportes" className="text-sm font-semibold text-[var(--blue-hover)] hover:underline">
          ← Volver a reportes
        </Link>
        <p className="text-[var(--black-60)]">Empresa no encontrada.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <Link href="/reportes" className="text-sm font-semibold text-[var(--blue-hover)] hover:underline">
        ← Volver a reportes
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] leading-8">{d.empresa.nombre}</h1>
          <p className="text-sm text-[var(--black-60)] mt-1">
            <span className="font-mono text-[var(--blue-hover)]">M{d.empresa.prefijo}-</span>
            {" · "}
            {d.empresa.contacto || "Sin contacto"}
            {" · "}
            {d.empresa.telefono || "Sin teléfono"}
          </p>
        </div>
        <a className="btn btn-primary" href={`/reportes/exportar?empresaId=${d.empresa.id}`}>
          Exportar CSV
        </a>
      </div>

      <Card className="p-0">
        <h2 className="text-base font-semibold p-5 pb-0">Lotes</h2>
        <div className="p-5">
          <Table>
            <thead>
              <tr>
                <Th>Descripción</Th>
                <Th>Cantidad</Th>
                <Th>Emitidos</Th>
                <Th>Canjeados</Th>
                <Th>Pendientes</Th>
                <Th>Estado</Th>
                <Th>Vencimiento</Th>
              </tr>
            </thead>
            <tbody>
              {d.lotes.length === 0 && (
                <tr>
                  <Td colSpan={7} className="text-center text-[var(--black-60)]">
                    Sin lotes registrados.
                  </Td>
                </tr>
              )}
              {d.lotes.map((l) => (
                <tr key={l.id}>
                  <Td className="font-semibold">{l.descripcion}</Td>
                  <Td>{l.cantidad}</Td>
                  <Td>{l.emitidos}</Td>
                  <Td>{l.canjeados}</Td>
                  <Td>{l.pendientes}</Td>
                  <Td>
                    {l.anulado ? <Badge tone="error">Anulado</Badge> : <Badge tone="success">Activo</Badge>}
                  </Td>
                  <Td>{l.vencimiento}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      <Card className="p-0">
        <h2 className="text-base font-semibold p-5 pb-0">Canjes</h2>
        {d.canjes.length === 0 ? (
          <p className="text-sm text-[var(--black-60)] p-5">Sin canjes aún</p>
        ) : (
          <div className="p-5">
            <Table>
              <thead>
                <tr>
                  <Th>Código</Th>
                  <Th>Sede</Th>
                  <Th>Portador</Th>
                  <Th>DNI</Th>
                  <Th>Fecha</Th>
                </tr>
              </thead>
              <tbody>
                {d.canjes.map((c) => (
                  <tr key={c.codigo}>
                    <Td className="font-mono text-xs">{c.codigo}</Td>
                    <Td>{c.sede ?? "—"}</Td>
                    <Td>{c.portadorNombre ?? "—"}</Td>
                    <Td>{c.portadorDni ?? "—"}</Td>
                    <Td>{c.fecha ? c.fecha.toLocaleString("es-HN") : "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>
    </section>
  );
}
