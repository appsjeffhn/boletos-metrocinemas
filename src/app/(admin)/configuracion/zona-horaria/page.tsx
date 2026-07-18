import Link from "next/link";
import { db } from "@/db/client";
import { zonaHoraria } from "@/domain/configuracion";
import { ZONAS_HORARIAS } from "@/lib/zonasHorarias";
import { ZonaForm } from "./ZonaForm";

export default async function ZonaHorariaPage() {
  const actual = await zonaHoraria(db);
  return (
    <section className="space-y-6">
      <Link href="/configuracion" className="text-sm font-semibold text-[var(--blue-hover)] hover:underline">
        ← Volver a configuración
      </Link>
      <h1 className="text-[28px] leading-8">Zona horaria</h1>
      <ZonaForm actual={actual} zonas={ZONAS_HORARIAS} />
    </section>
  );
}
