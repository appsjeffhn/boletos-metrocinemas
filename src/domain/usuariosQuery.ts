import { eq } from "drizzle-orm";
import type { DrizzleDb } from "@/db/client";
import { sedes, usuarios, usuarioSedes } from "@/db/schema";

export type UsuarioListado = {
  id: number;
  usuario: string;
  puedeAdmin: boolean;
  puedeTaquilla: boolean;
  activo: boolean;
  sedes: string[];
  sedeIds: number[];
};

export async function listarUsuarios(db: DrizzleDb): Promise<UsuarioListado[]> {
  const filas = await db
    .select({
      id: usuarios.id, usuario: usuarios.usuario,
      puedeAdmin: usuarios.puedeAdmin, puedeTaquilla: usuarios.puedeTaquilla,
      activo: usuarios.activo, sede: sedes.nombre, sedeId: sedes.id,
    })
    .from(usuarios)
    .leftJoin(usuarioSedes, eq(usuarioSedes.usuarioId, usuarios.id))
    .leftJoin(sedes, eq(sedes.id, usuarioSedes.sedeId))
    .orderBy(usuarios.usuario);

  const porUsuario = new Map<number, UsuarioListado>();
  for (const fila of filas) {
    let u = porUsuario.get(fila.id);
    if (!u) {
      u = {
        id: fila.id, usuario: fila.usuario, puedeAdmin: fila.puedeAdmin,
        puedeTaquilla: fila.puedeTaquilla, activo: fila.activo, sedes: [], sedeIds: [],
      };
      porUsuario.set(fila.id, u);
    }
    if (fila.sede) u.sedes.push(fila.sede);
    if (fila.sedeId) u.sedeIds.push(fila.sedeId);
  }
  return Array.from(porUsuario.values());
}
