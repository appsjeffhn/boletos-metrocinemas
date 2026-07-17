import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { cerrarSesion } from "@/app/(admin)/logout/actions";
import { BrandHeader } from "@/components/BrandHeader";
import { Card } from "@/components/ui/Card";
import MultiScanner from "./MultiScanner";

function BotonCerrarSesion() {
  return (
    <form action={cerrarSesion}>
      <button className="text-sm text-white/70 hover:text-white">Cerrar sesión</button>
    </form>
  );
}

export default async function TaquillaMultiplePage() {
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

  return (
    <main className="min-h-screen">
      <BrandHeader right={<BotonCerrarSesion />} />
      <div className="max-w-sm mx-auto p-6 space-y-4">
        <Link href="/taquilla" className="text-sm underline" style={{ color: "var(--blue-hover)" }}>
          ← Volver a escaneo sencillo
        </Link>
        <MultiScanner />
      </div>
    </main>
  );
}
