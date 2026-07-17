import Link from "next/link";
import { db } from "@/db/client";
import { reportePorEmpresa } from "@/domain/reportes";

export default async function ReportesPage() {
  const rep = await reportePorEmpresa(db);
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Reportes</h1>
        <Link href="/logout" className="text-sm text-neutral-400">Cerrar sesión</Link>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-neutral-400"><th>Empresa</th><th>Emitidos</th><th>Canjeados</th><th>Pendientes</th><th></th></tr></thead>
        <tbody>
          {rep.map((r) => (
            <tr key={r.empresaId} className="border-t border-neutral-800">
              <td>{r.empresa}</td><td>{r.emitidos}</td><td>{r.canjeados}</td><td>{r.pendientes}</td>
              <td><a className="text-red-400" href={`/reportes/exportar?empresaId=${r.empresaId}`}>Exportar CSV</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
