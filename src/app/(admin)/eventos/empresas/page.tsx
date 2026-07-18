import Link from "next/link";
import { db } from "@/db/client";
import { listarEmpresas } from "@/domain/empresasQuery";
import { EmpresasTabla } from "./EmpresasTabla";

export default async function EmpresasPage() {
  const empresas = await listarEmpresas(db);

  return (
    <section className="space-y-6">
      <Link href="/eventos" className="text-sm font-semibold text-[var(--blue-hover)] hover:underline">
        ← Volver a eventos
      </Link>
      <h1 className="text-[28px] leading-8">Empresas</h1>

      <EmpresasTabla empresas={empresas} />
    </section>
  );
}
