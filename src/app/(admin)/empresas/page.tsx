import { db } from "@/db/client";
import { listarEmpresas } from "@/domain/empresasQuery";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { crearEmpresa } from "./actions";
import { EmpresasTabla } from "./EmpresasTabla";

export default async function EmpresasPage() {
  const empresas = await listarEmpresas(db);

  return (
    <section className="space-y-6">
      <h1 className="text-[28px] leading-8">Empresas</h1>

      <Card>
        <h2 className="text-base font-semibold mb-4">Nueva empresa</h2>
        <form action={crearEmpresa} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
          <Input label="Nombre" name="nombre" placeholder="Nombre de la empresa" required />
          <div className="flex flex-col gap-1">
            <Input label="Prefijo (opcional)" name="prefijo" placeholder="ej. MOK" maxLength={6} />
            <p className="text-xs text-[var(--black-60)]">
              Se antepone M; ej. MOK → MMOK-
            </p>
          </div>
          <Input label="Contacto" name="contacto" placeholder="Nombre de contacto" />
          <Input label="Teléfono" name="telefono" placeholder="Teléfono" />
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" variant="primary">
              Agregar
            </Button>
          </div>
        </form>
      </Card>

      <EmpresasTabla empresas={empresas} />
    </section>
  );
}
