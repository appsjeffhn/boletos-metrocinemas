import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { obtenerBoletoPorToken } from "@/domain/boletos";
import { getCurrentUser } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import FormularioCanje from "./FormularioCanje";

const MENSAJES = {
  invalido: "Boleto inválido o falso",
  canjeado: "Este boleto ya fue canjeado",
  anulado: "Boleto anulado",
  vencido: "Boleto vencido",
  sede_no_valida: "Este boleto no es válido en esta sede",
} as const;

export default async function CanjePage({ params }: { params: Promise<{ token: string }> }) {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  const { token } = await params;
  const r = await obtenerBoletoPorToken(db, token);

  if (!r.ok) {
    const msg = MENSAJES[r.razon];
    const canje = r.boleto?.canje;
    return (
      <main
        className="min-h-screen grid place-items-center p-6"
        style={{ background: "var(--error-150)" }}
      >
        <Card className="max-w-sm w-full text-center space-y-4">
          <p className="text-2xl font-bold" style={{ color: "var(--error-150)" }}>✕ {msg}</p>
          {r.razon === "canjeado" && canje && (
            <div className="text-left text-sm space-y-1 pt-2 border-t" style={{ borderColor: "var(--black-10)" }}>
              <p><span className="font-semibold">Sede:</span> {canje.sede ?? "—"}</p>
              <p><span className="font-semibold">Fecha:</span> {canje.fecha ? new Date(canje.fecha).toLocaleString("es-HN") : "—"}</p>
              <p><span className="font-semibold">Portador:</span> {canje.portadorNombre ?? "—"} ({canje.portadorDni ?? "—"})</p>
              <p><span className="font-semibold">Operador:</span> {canje.operador ?? "—"}</p>
            </div>
          )}
          <a href="/taquilla" className="btn btn-secondary w-full">Escanear otro</a>
        </Card>
      </main>
    );
  }
  return <FormularioCanje token={token} codigo={r.boleto.codigo} empresa={r.boleto.empresa} />;
}
