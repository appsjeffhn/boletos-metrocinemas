"use client";
import { useActionState } from "react";
import { iniciarSesion } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<{ error?: string }, FormData>(
    iniciarSesion,
    { error: undefined },
  );
  return (
    <main className="min-h-screen grid place-items-center bg-neutral-950 text-white p-4">
      <form action={action} className="w-full max-w-sm space-y-4 bg-neutral-900 p-6 rounded-xl">
        <h1 className="text-xl font-bold">Metrocinemas — Boletos</h1>
        <input name="usuario" placeholder="Usuario" className="w-full p-3 rounded bg-neutral-800" required />
        <input name="password" type="password" placeholder="Contraseña" className="w-full p-3 rounded bg-neutral-800" required />
        {state?.error && <p className="text-red-400 text-sm">{state.error}</p>}
        <button disabled={pending} className="w-full p-3 rounded bg-red-600 font-semibold disabled:opacity-50">
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
