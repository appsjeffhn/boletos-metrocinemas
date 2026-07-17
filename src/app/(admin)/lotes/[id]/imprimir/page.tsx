import { db } from "@/db/client";
import { boletosDeLote } from "@/domain/boletosQuery";

export default async function ImprimirPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const filas = await boletosDeLote(db, Number(id));
  return (
    <div className="bg-white text-black p-4">
      <p className="print:hidden mb-4 text-sm">Usa <b>Ctrl/Cmd + P</b> para guardar como PDF e imprimir.</p>
      <div className="grid grid-cols-3 gap-4">
        {filas.map((b) => (
          <div key={b.token} className="border rounded p-3 flex flex-col items-center break-inside-avoid">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qr/${b.token}`} alt={b.codigo} width={160} height={160} />
            <span className="mt-2 font-mono text-sm">{b.codigo}</span>
            <span className="text-xs text-neutral-500">Metrocinemas</span>
          </div>
        ))}
      </div>
    </div>
  );
}
