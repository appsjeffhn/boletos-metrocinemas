import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sedes } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { BrandHeader } from "@/components/BrandHeader";
import { Card } from "@/components/ui/Card";
import Scanner from "@/components/Scanner";

export default async function TaquillaPage() {
  const u = await getCurrentUser();
  if (!u || !u.puedeTaquilla) redirect("/login");
  if (!u.activeSedeId) {
    if (u.sedeIds.length > 0) redirect("/elegir-sede");
    return (
      <main className="min-h-screen">
        <BrandHeader />
        <div className="max-w-sm mx-auto p-6">
          <Card className="text-center">
            <p className="text-sm" style={{ color: "var(--black-60)" }}>
              Tu usuario no tiene una sede activa asignada. Contacta a un administrador.
            </p>
          </Card>
        </div>
      </main>
    );
  }

  const [sede] = await db.select().from(sedes).where(eq(sedes.id, u.activeSedeId));

  return (
    <main className="min-h-screen">
      <BrandHeader />
      <div className="max-w-sm mx-auto p-6 space-y-4">
        <Card className="text-center space-y-1">
          <p className="text-xs font-bold uppercase" style={{ color: "var(--black-60)" }}>Sede activa</p>
          <p className="text-lg font-semibold">{sede?.nombre ?? "—"}</p>
          {u.sedeIds.length > 1 && (
            <Link href="/elegir-sede" className="text-sm underline" style={{ color: "var(--blue-hover)" }}>
              Cambiar sede
            </Link>
          )}
        </Card>

        <Card>
          <h1 className="text-base font-semibold text-center mb-4">Escanear boleto</h1>
          <Scanner />
          <p className="text-center text-sm mt-4" style={{ color: "var(--black-60)" }}>
            Apunta la cámara al código QR del boleto.
          </p>
        </Card>
      </div>
    </main>
  );
}
