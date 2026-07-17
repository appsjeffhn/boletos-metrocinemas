import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function ReportesPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-[28px] leading-8">Reportes</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/reportes/empresas" className="block">
          <Card className="h-full hover:border-[var(--blue-hover)] transition-colors">
            <h2 className="text-base font-semibold">Reporte de empresas</h2>
            <p className="text-sm text-[var(--black-60)] mt-1">
              Emitidos, canjeados y pendientes por empresa, con el valor de los items otorgados.
            </p>
          </Card>
        </Link>

        <Link href="/reportes/productos" className="block">
          <Card className="h-full hover:border-[var(--blue-hover)] transition-colors">
            <h2 className="text-base font-semibold">Reporte de items</h2>
            <p className="text-sm text-[var(--black-60)] mt-1">
              Items creados, canjeados y pendientes con importes; filtros por fecha/empresa/sede y CSV.
            </p>
          </Card>
        </Link>
      </div>
    </section>
  );
}
