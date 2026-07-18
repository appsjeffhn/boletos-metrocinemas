import Link from "next/link";
import { db } from "@/db/client";
import { listarUsuarios } from "@/domain/usuariosQuery";
import { listarSedes } from "@/domain/sedesQuery";
import { UsuariosPanel } from "./UsuariosPanel";

export default async function UsuariosPage() {
  const [sedes, usuarios] = await Promise.all([
    listarSedes(db),
    listarUsuarios(db),
  ]);

  return (
    <section className="space-y-6">
      <Link href="/configuracion" className="text-sm font-semibold text-[var(--blue-hover)] hover:underline">
        ← Volver a configuración
      </Link>
      <h1 className="text-[28px] leading-8">Usuarios</h1>
      <UsuariosPanel usuarios={usuarios} sedes={sedes} />
    </section>
  );
}
