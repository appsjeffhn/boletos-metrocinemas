"use client";
import { useActionState } from "react";
import { BrandHeader } from "@/components/BrandHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { confirmarCanje, type CanjeState } from "./actions";

export default function FormularioCanje(
  { token, codigo, empresa, productos }: {
    token: string; codigo: string; empresa: string;
    productos: { nombre: string; detalle: string | null; cantidadPorBoleto: number }[];
  },
) {
  const [state, action, pending] = useActionState<CanjeState, FormData>(
    confirmarCanje.bind(null, token),
    {},
  );

  const listaProductos = productos.length > 0 && (
    <div className="text-left text-sm space-y-1 pt-2 border-t" style={{ borderColor: "var(--black-10)" }}>
      <p className="font-semibold">Incluye:</p>
      <ul className="list-disc pl-5">
        {productos.map((p, i) => (
          <li key={i}>{p.nombre}{p.detalle ? ` · ${p.detalle}` : ""} · ×{p.cantidadPorBoleto}</li>
        ))}
      </ul>
    </div>
  );

  if (state?.ok) {
    return (
      <main
        className="min-h-screen grid place-items-center p-6"
        style={{ background: "var(--success-150)" }}
      >
        <Card className="max-w-sm w-full text-center space-y-4">
          <div className="mx-auto grid place-items-center" style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--success-10)" }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" style={{ color: "var(--success-150)" }}><path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div>
            <p className="text-xl font-bold" style={{ color: "var(--success-150)" }}>Canje exitoso</p>
            <p className="font-mono text-lg mt-1">{state.codigo}</p>
          </div>
          {listaProductos}
          <a href="/taquilla" className="btn btn-primary btn-lg w-full">Escanear otro</a>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <BrandHeader />
      <div className="max-w-sm mx-auto p-6 space-y-4">
        <Card className="space-y-1">
          <p className="text-xs font-bold uppercase" style={{ color: "var(--black-60)" }}>Boleto válido</p>
          <p className="font-mono text-lg">{codigo}</p>
          <p className="text-sm" style={{ color: "var(--black-60)" }}>Empresa: {empresa}</p>
          {listaProductos}
        </Card>

        <Card>
          <form action={action} className="space-y-4">
            <Input name="portadorNombre" label="Nombre del portador" required />
            <Input name="portadorDni" label="DNI del portador" required />
            {state?.error && <p className="text-sm" style={{ color: "var(--error-150)" }}>{state.error}</p>}
            <Button type="submit" size="lg" disabled={pending} className="w-full">
              {pending ? "Canjeando…" : "Confirmar canje"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
