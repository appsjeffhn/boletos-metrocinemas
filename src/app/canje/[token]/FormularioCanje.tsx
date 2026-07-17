"use client";
import { useActionState } from "react";
import { confirmarCanje, type CanjeState } from "./actions";

export default function FormularioCanje(
  { token, codigo, empresa }: { token: string; codigo: string; empresa: string },
) {
  const [state, action, pending] = useActionState<CanjeState, FormData>(
    confirmarCanje.bind(null, token),
    {},
  );
  if (state?.ok) {
    return (
      <main className="min-h-screen grid place-items-center bg-green-800 text-white p-6 text-center">
        <div><p className="text-3xl font-bold">✓ Canje exitoso</p><p className="mt-2 font-mono">{state.codigo}</p>
          <a href="/taquilla" className="inline-block mt-6 underline">Escanear otro</a></div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-neutral-950 text-white p-4">
      <div className="max-w-sm mx-auto space-y-4">
        <div className="bg-neutral-900 p-4 rounded">
          <p className="text-sm text-neutral-400">Boleto válido</p>
          <p className="font-mono text-lg">{codigo}</p>
          <p className="text-sm">Empresa: {empresa}</p>
        </div>
        <form action={action} className="space-y-3">
          <input name="portadorNombre" placeholder="Nombre del portador" required className="w-full p-3 rounded bg-neutral-800" />
          <input name="portadorDni" placeholder="DNI del portador" required className="w-full p-3 rounded bg-neutral-800" />
          {state?.error && <p className="text-red-400">{state.error}</p>}
          <button disabled={pending} className="w-full p-3 rounded bg-green-600 font-semibold disabled:opacity-50">
            {pending ? "Canjeando…" : "Confirmar canje"}
          </button>
        </form>
      </div>
    </main>
  );
}
