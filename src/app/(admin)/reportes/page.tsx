import { LandingCards, type LandingItem } from "@/components/LandingCards";

const items: LandingItem[] = [
  { href: "/reportes/empresas", title: "Reporte de empresas", desc: "Emitidos, canjeados y pendientes por empresa, con el valor de los items otorgados.", icon: "reportEmpresas" },
  { href: "/reportes/productos", title: "Reporte de items", desc: "Items creados, canjeados y pendientes con importes; filtros por fecha/empresa/sede y CSV.", icon: "reportItems" },
];

export default function ReportesPage() {
  return (
    <section className="space-y-6">
      <h1>Reportes</h1>
      <LandingCards items={items} />
    </section>
  );
}
