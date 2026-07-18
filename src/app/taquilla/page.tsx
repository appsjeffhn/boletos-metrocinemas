import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sedes } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { cerrarSesion } from "@/app/(admin)/logout/actions";
import { BrandHeader } from "@/components/BrandHeader";
import { Card } from "@/components/ui/Card";
import Scanner from "@/components/Scanner";

function BotonCerrarSesion() {
  return (
    <form action={cerrarSesion}>
      <button className="text-sm text-white/70 hover:text-white">Cerrar sesión</button>
    </form>
  );
}

export default async function TaquillaPage() {
  const u = await getCurrentUser();
  if (!u || !u.puedeTaquilla) redirect("/login");
  if (!u.activeSedeId) {
    if (u.sedeIds.length > 0) redirect("/elegir-sede");
    return (
      <main className="min-h-screen">
        <BrandHeader right={<BotonCerrarSesion />} />
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
  // Si la sede activa fue desactivada (p. ej. mientras la sesión seguía abierta),
  // no se puede canjear ahí: mandar a elegir otra sede activa.
  if (!sede || !sede.activo) redirect("/elegir-sede");

  return (
    <main className="min-h-screen">
      <BrandHeader right={<BotonCerrarSesion />} />
      <div className="max-w-sm mx-auto p-4 space-y-3">
        {/* Sede compacta en una línea */}
        <div className="flex items-center justify-between gap-2 text-sm px-1">
          <span className="truncate">
            <span style={{ color: "var(--black-60)" }}>Sede: </span>
            <span className="font-semibold">{sede?.nombre ?? "—"}</span>
          </span>
          {u.sedeIds.length > 1 && (
            <Link href="/elegir-sede" className="shrink-0 underline" style={{ color: "var(--blue-hover)" }}>
              Cambiar
            </Link>
          )}
        </div>

        {/* Escaneo múltiple arriba */}
        <Link href="/taquilla/multiple" className="btn btn-gold w-full">
          Escaneo múltiple
        </Link>

        {/* Escaneo individual */}
        <Card className="p-4">
          <h1 className="text-base font-semibold text-center mb-3">Escanear boleto</h1>
          <Scanner />
          <p className="text-center text-sm mt-3" style={{ color: "var(--black-60)" }}>
            Apunta la cámara al código QR del boleto.
          </p>
        </Card>
      </div>
    </main>
  );
}
