import Link from "next/link";
import { db } from "@/db/client";
import { reportePorEmpresa } from "@/domain/reportes";
import { Table, Th, Td } from "@/components/ui/Table";

export default async function ReportesPage() {
  const rep = await reportePorEmpresa(db);

  return (
    <section className="space-y-6">
      <h1 className="text-[28px] leading-8">Reportes</h1>

      <Link href="/reportes/productos" className="btn btn-secondary text-sm">
        Reporte de items
      </Link>

      <Table>
        <thead>
          <tr>
            <Th>Empresa</Th>
            <Th>Emitidos</Th>
            <Th>Canjeados</Th>
            <Th>Pendientes</Th>
            <Th>Acciones</Th>
          </tr>
        </thead>
        <tbody>
          {rep.length === 0 && (
            <tr>
              <Td colSpan={5} className="text-center text-[var(--black-60)]">
                Aún no hay empresas registradas.
              </Td>
            </tr>
          )}
          {rep.map((r) => (
            <tr key={r.empresaId}>
              <Td className="font-semibold">
                <Link href={`/reportes/${r.empresaId}`} className="hover:text-[var(--blue-hover)]">
                  {r.empresa}
                </Link>
              </Td>
              <Td>{r.emitidos}</Td>
              <Td>{r.canjeados}</Td>
              <Td>{r.pendientes}</Td>
              <Td>
                <a
                  className="text-sm font-semibold text-[var(--blue-hover)] hover:underline"
                  href={`/reportes/exportar?empresaId=${r.empresaId}`}
                >
                  Exportar CSV
                </a>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </section>
  );
}
