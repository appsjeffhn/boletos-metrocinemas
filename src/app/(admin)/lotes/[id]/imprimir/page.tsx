import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { lotes, empresas } from "@/db/schema";
import { boletosDeLote } from "@/domain/boletosQuery";

export default async function ImprimirPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loteId = Number(id);

  const [lote, filas] = await Promise.all([
    db
      .select({ descripcion: lotes.descripcion, empresa: empresas.nombre, fechaVencimiento: lotes.fechaVencimiento })
      .from(lotes)
      .innerJoin(empresas, eq(lotes.empresaId, empresas.id))
      .where(eq(lotes.id, loteId))
      .then((r) => r[0]),
    boletosDeLote(db, loteId),
  ]);

  return (
    <div style={{ background: "#fff", color: "var(--black-100)", minHeight: "100vh" }} className="p-6">
      <div className="print:hidden mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {lote ? `${lote.empresa} — ${lote.descripcion}` : `Lote #${loteId}`}
          </h1>
          {lote && <p className="text-sm text-[var(--black-60)]">Vence: {lote.fechaVencimiento} · {filas.length} boletos</p>}
        </div>
        <p
          className="text-sm px-3 py-2 rounded-[var(--radius-sm)]"
          style={{ background: "var(--blue-10)", color: "var(--blue-hover)" }}
        >
          Usa <strong>Ctrl/Cmd + P</strong> para guardar como PDF o imprimir.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-3 print:gap-3">
        {filas.map((b) => (
          <div
            key={b.token}
            className="flex flex-col items-center justify-center gap-2 p-4 break-inside-avoid"
            style={{ border: "1px solid var(--black-10)", borderRadius: "var(--radius-md)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qr/${b.token}`} alt={b.codigo} width={160} height={160} />
            <span className="font-mono text-sm font-semibold">{b.codigo}</span>
            <span className="text-xs text-[var(--black-60)]">Metrocinemas</span>
          </div>
        ))}
      </div>
    </div>
  );
}
