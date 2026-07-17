import { db } from "@/db/client";
import { listarEmpresas } from "@/domain/empresasQuery";
import { crearEmpresa } from "./actions";

export default async function EmpresasPage() {
  const filas = await listarEmpresas(db);
  return (
    <section className="space-y-6">
      <h1 className="text-lg font-bold">Empresas (clientes)</h1>
      <form action={crearEmpresa} className="flex flex-wrap gap-2">
        <input name="nombre" placeholder="Nombre" required className="p-2 rounded bg-neutral-800" />
        <input name="prefijo" placeholder="Prefijo (ej. MOK)" maxLength={6} className="p-2 rounded bg-neutral-800 w-40" />
        <input name="contacto" placeholder="Contacto" className="p-2 rounded bg-neutral-800" />
        <button className="px-4 rounded bg-red-600">Agregar</button>
      </form>
      <p className="text-xs text-neutral-500">Si dejas el prefijo vacío se genera de las iniciales del nombre. El código queda como M{"{"}prefijo{"}"}-XXXXXX.</p>
      <ul className="divide-y divide-neutral-800">
        {filas.map((e) => (
          <li key={e.id} className="py-2">{e.nombre} <span className="font-mono text-red-400 text-sm">M{e.prefijo}-</span> <span className="text-neutral-400 text-sm">{e.contacto}</span></li>
        ))}
      </ul>
    </section>
  );
}
