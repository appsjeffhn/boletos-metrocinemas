import Link from "next/link";
import { db } from "@/db/client";
import { listarSedes } from "@/domain/sedesQuery";
import { SedesPanel } from "./SedesPanel";

export default async function SedesPage() {
  const sedes = await listarSedes(db);
  return (
    <section className="space-y-6">
      <Link href="/configuracion" className="text-sm font-semibold text-[var(--blue-hover)] hover:underline">
        ← Volver a configuración
      </Link>
      <h1 className="text-[28px] leading-8">Sedes</h1>
      <SedesPanel sedes={sedes} />
    </section>
  );
}
