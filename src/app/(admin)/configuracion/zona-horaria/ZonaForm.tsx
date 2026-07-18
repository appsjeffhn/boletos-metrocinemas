"use client";
import { useActionState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { guardarZonaAction, type ZonaActionResult } from "./actions";

export function ZonaForm({ actual, zonas }: { actual: string; zonas: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState<ZonaActionResult, FormData>(guardarZonaAction, {});
  return (
    <Card className="max-w-md space-y-4">
      <p className="text-sm text-[var(--black-60)]">
        Determina la fecha de vencimiento de los boletos y el cálculo de “hoy” en los reportes.
      </p>
      <form action={action} className="space-y-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Zona horaria</span>
          <select name="zonaHoraria" defaultValue={actual} className="input">
            {zonas.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
          </select>
        </label>
        {state?.error && <p className="text-sm text-[var(--error-150)]">{state.error}</p>}
        {state?.ok && <p className="text-sm" style={{ color: "var(--success-150)" }}>Zona horaria guardada.</p>}
        <Button type="submit" variant="primary" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</Button>
      </form>
    </Card>
  );
}
