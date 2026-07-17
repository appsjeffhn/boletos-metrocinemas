import { db } from "@/db/client";
import { sedes as sedesTable } from "@/db/schema";
import { listarEmpresas } from "@/domain/empresasQuery";
import { listarLotes } from "@/domain/lotesQuery";
import { LotesPanel } from "./LotesPanel";

export default async function LotesPage() {
  const [empresas, lotes, sedes] = await Promise.all([
    listarEmpresas(db),
    listarLotes(db),
    db.select({ id: sedesTable.id, nombre: sedesTable.nombre }).from(sedesTable).orderBy(sedesTable.nombre),
  ]);

  return (
    <section className="space-y-6">
      <h1 className="text-[28px] leading-8">Lotes de boletos</h1>
      <LotesPanel lotes={lotes} empresas={empresas} sedes={sedes} />
    </section>
  );
}
