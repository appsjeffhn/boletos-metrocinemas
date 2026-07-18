import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { sedes } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { BrandHeader } from "@/components/BrandHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { elegirSede } from "./actions";

export default async function ElegirSedePage() {
  const u = await getCurrentUser();
  if (!u || !u.puedeTaquilla) redirect("/login");
  if (u.sedeIds.length === 0) redirect("/taquilla");

  const listaSedes = await db
    .select()
    .from(sedes)
    .where(and(inArray(sedes.id, u.sedeIds), eq(sedes.activo, true)))
    .orderBy(sedes.nombre);

  return (
    <main className="min-h-screen">
      <BrandHeader />
      <div className="max-w-md mx-auto p-6 space-y-4">
        <h1 className="text-lg font-bold text-center">Elige tu sede</h1>
        <p className="text-sm text-center" style={{ color: "var(--black-60)" }}>
          Tu usuario tiene acceso a varias sedes. Selecciona con la que vas a trabajar.
        </p>
        <div className="grid gap-3">
          {listaSedes.length === 0 && (
            <p className="text-sm text-center" style={{ color: "var(--black-60)" }}>
              No tienes sedes activas asignadas. Contacta a un administrador.
            </p>
          )}
          {listaSedes.map((s) => (
            <Card key={s.id} className="p-0">
              <form action={elegirSede}>
                <input type="hidden" name="sedeId" value={s.id} />
                <Button type="submit" variant="secondary" className="w-full justify-center py-4">
                  {s.nombre}
                </Button>
              </form>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
