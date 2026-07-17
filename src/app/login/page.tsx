"use client";
import { useActionState } from "react";
import { BrandHeader } from "@/components/BrandHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { iniciarSesion } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<{ error?: string }, FormData>(
    iniciarSesion,
    { error: undefined },
  );
  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--background-page)" }}>
      <BrandHeader />
      <div className="flex-1 grid place-items-center p-4">
        <Card className="w-full max-w-sm">
          <form action={action} className="space-y-4">
            <div className="text-center space-y-1">
              <h1 className="text-xl font-medium" style={{ color: "var(--black-100)" }}>
                Ingresar
              </h1>
              <p className="text-sm" style={{ color: "var(--black-60)" }}>
                Boletos Metrocinemas
              </p>
            </div>
            <Input
              name="usuario"
              label="Usuario"
              placeholder="Tu usuario"
              required
              autoComplete="username"
            />
            <Input
              name="password"
              type="password"
              label="Contraseña"
              placeholder="Tu contraseña"
              required
              autoComplete="current-password"
            />
            {state?.error && (
              <p
                className="text-sm rounded-md px-3 py-2"
                style={{ color: "var(--error-150)", background: "var(--error-10)" }}
              >
                {state.error}
              </p>
            )}
            <Button type="submit" variant="primary" className="w-full justify-center" disabled={pending}>
              {pending ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
