import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { obtenerBoletoPorToken } from "@/domain/boletos";
import { productosPorToken } from "@/domain/loteProductosQuery";
import { getCurrentUser } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { hoyISOEn, fechaHoraEn } from "@/lib/fechas";
import { zonaHoraria } from "@/domain/configuracion";
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
  const tz = await zonaHoraria(db);
  const hoy = hoyISOEn(tz);
  const r = await obtenerBoletoPorToken(db, token, hoy);

  if (!r.ok) {
    const msg = MENSAJES[r.razon];
    const canje = r.boleto?.canje;
    return (
      <main
        className="min-h-screen grid place-items-center p-6"
        style={{ background: "var(--error-150)" }}
      >
        <Card className="max-w-sm w-full text-center space-y-4">
          <div className="mx-auto grid place-items-center" style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--error-10)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ color: "var(--error-150)" }}><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
          </div>
          <p className="text-xl font-bold" style={{ color: "var(--error-150)" }}>{msg}</p>
          {r.razon === "canjeado" && canje && (
            <div className="text-left text-sm space-y-1 pt-2 border-t" style={{ borderColor: "var(--black-10)" }}>
              <p><span className="font-semibold">Sede:</span> {canje.sede ?? "—"}</p>
              <p><span className="font-semibold">Fecha:</span> {canje.fecha ? fechaHoraEn(new Date(canje.fecha), tz) : "—"}</p>
              <p><span className="font-semibold">Portador:</span> {canje.portadorNombre ?? "—"} ({canje.portadorDni ?? "—"})</p>
              <p><span className="font-semibold">Operador:</span> {canje.operador ?? "—"}</p>
            </div>
          )}
          <a href="/taquilla" className="btn btn-primary btn-lg w-full">Escanear otro</a>
        </Card>
      </main>
    );
  }
  const productos = await productosPorToken(db, token);
  return (
    <FormularioCanje
      token={token}
      codigo={r.boleto.codigo}
      empresa={r.boleto.empresa}
      productos={productos}
    />
  );
}
