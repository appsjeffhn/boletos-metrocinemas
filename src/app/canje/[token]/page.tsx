import { db } from "@/db/client";
import { obtenerBoletoPorToken } from "@/domain/boletos";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import FormularioCanje from "./FormularioCanje";

export default async function CanjePage({ params }: { params: Promise<{ token: string }> }) {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  const { token } = await params;
  const r = await obtenerBoletoPorToken(db, token);

  if (!r.ok) {
    const msg = { invalido: "Boleto inválido o falso", canjeado: "Ya fue canjeado", anulado: "Boleto anulado", vencido: "Boleto vencido" }[r.razon];
    return (
      <main className="min-h-screen grid place-items-center bg-red-900 text-white p-6 text-center">
        <div><p className="text-3xl font-bold">✕ {msg}</p>
          {r.boleto?.canje?.fecha && <p className="mt-2">Canjeado en {r.boleto.canje.sede} el {new Date(r.boleto.canje.fecha).toLocaleString("es-HN")}</p>}
          <a href="/taquilla" className="inline-block mt-6 underline">Escanear otro</a></div>
      </main>
    );
  }
  return <FormularioCanje token={token} codigo={r.boleto.codigo} empresa={r.boleto.empresa} />;
}
