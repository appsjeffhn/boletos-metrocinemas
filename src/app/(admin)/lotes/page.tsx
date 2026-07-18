import { db } from "@/db/client";
import { listarEmpresas } from "@/domain/empresasQuery";
import { listarLotes } from "@/domain/lotesQuery";
import { listarProductos } from "@/domain/productosQuery";
import { productosDeLotes } from "@/domain/loteProductosQuery";
import { listarSedes } from "@/domain/sedesQuery";
import { LotesPanel } from "./LotesPanel";

export default async function LotesPage() {
  const [empresas, lotes, sedes, catalogo] = await Promise.all([
    listarEmpresas(db),
    listarLotes(db),
    listarSedes(db),
    listarProductos(db),
  ]);

  const productosPorLote = await productosDeLotes(db, lotes.map((l) => l.id));

  return (
    <section className="space-y-6">
      <h1 className="text-[28px] leading-8">Lotes de boletos</h1>
      <LotesPanel
        lotes={lotes}
        empresas={empresas}
        sedes={sedes}
        catalogo={catalogo}
        productosPorLote={productosPorLote}
      />
    </section>
  );
}
