import Link from "next/link";
import { db } from "@/db/client";
import { listarEmpresas } from "@/domain/empresasQuery";
import { listarLotes } from "@/domain/lotesQuery";
import { crearLoteAction } from "./actions";

export default async function LotesPage() {
  const [empresas, lotes] = await Promise.all([listarEmpresas(db), listarLotes(db)]);
  return (
    <section className="space-y-6">
      <h1 className="text-lg font-bold">Lotes de boletos</h1>
      <form action={crearLoteAction} className="grid sm:grid-cols-5 gap-2">
        <select name="empresaId" required className="p-2 rounded bg-neutral-800">
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <input name="descripcion" placeholder="Descripción" required className="p-2 rounded bg-neutral-800" />
        <input name="cantidad" type="number" min="1" placeholder="Cantidad" required className="p-2 rounded bg-neutral-800" />
        <input name="fechaVencimiento" type="date" required className="p-2 rounded bg-neutral-800" />
        <button className="px-4 rounded bg-red-600">Generar</button>
      </form>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-neutral-400"><th>Empresa</th><th>Descripción</th><th>Cant.</th><th>Vence</th><th></th></tr></thead>
        <tbody>
          {lotes.map((l) => (
            <tr key={l.id} className="border-t border-neutral-800">
              <td>{l.empresa}</td><td>{l.descripcion}</td><td>{l.cantidad}</td><td>{l.fechaVencimiento}</td>
              <td><Link className="text-red-400" href={`/lotes/${l.id}/imprimir`}>Imprimir QR</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
