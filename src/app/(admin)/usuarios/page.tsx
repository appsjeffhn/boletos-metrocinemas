import { db } from "@/db/client";
import { sedes as sedesTable, usuarios as usuariosTable } from "@/db/schema";
import { crearUsuario } from "./actions";

export default async function UsuariosPage() {
  const [sedes, usuarios] = await Promise.all([
    db.select().from(sedesTable).orderBy(sedesTable.nombre),
    db.select().from(usuariosTable).orderBy(usuariosTable.usuario),
  ]);
  return (
    <section className="space-y-6">
      <h1 className="text-lg font-bold">Usuarios</h1>
      <form action={crearUsuario} className="grid sm:grid-cols-5 gap-2">
        <input name="usuario" placeholder="Usuario" required className="p-2 rounded bg-neutral-800" />
        <input name="password" type="password" placeholder="Contraseña (mín 6)" required className="p-2 rounded bg-neutral-800" />
        <select name="rol" className="p-2 rounded bg-neutral-800"><option value="taquilla">Taquilla</option><option value="admin">Admin</option></select>
        <select name="sedeId" className="p-2 rounded bg-neutral-800">{sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select>
        <button className="px-4 rounded bg-red-600">Crear</button>
      </form>
      <ul className="divide-y divide-neutral-800">
        {usuarios.map((u) => <li key={u.id} className="py-2">{u.usuario} — <span className="text-neutral-400">{u.rol}</span></li>)}
      </ul>
    </section>
  );
}
