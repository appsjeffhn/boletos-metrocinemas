"use client";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Table, Th, Td } from "@/components/ui/Table";
import type { UsuarioListado } from "@/domain/usuariosQuery";
import { crearUsuario, editarUsuario, toggleUsuarioActivo, type UsuarioActionResult } from "./actions";

type Sede = { id: number; nombre: string };

function SedesSelector({
  sedes,
  idPrefix,
  initialSelectedIds = [],
}: {
  sedes: Sede[];
  idPrefix: string;
  initialSelectedIds?: number[];
}) {
  const [todas, setTodas] = useState(sedes.length > 0 && initialSelectedIds.length === sedes.length);
  const [selected, setSelected] = useState<Set<number>>(new Set(initialSelectedIds));

  return (
    <div className="flex flex-col gap-2">
      <span className="font-semibold text-sm text-[var(--black-100)]">Sucursales</span>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="todas"
          value="1"
          checked={todas}
          onChange={(e) => setTodas(e.target.checked)}
        />
        Todas las sucursales
      </label>
      {sedes.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pl-1">
          {sedes.map((s) => (
            <label key={`${idPrefix}-${s.id}`} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="sedeIds"
                value={s.id}
                disabled={todas}
                checked={todas ? true : selected.has(s.id)}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(s.id);
                  else next.delete(s.id);
                  setSelected(next);
                }}
              />
              {s.nombre}
            </label>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--black-60)]">No hay sucursales registradas.</p>
      )}
    </div>
  );
}

export function UsuariosPanel({ usuarios, sedes }: { usuarios: UsuarioListado[]; sedes: Sede[] }) {
  const [editando, setEditando] = useState<UsuarioListado | null>(null);
  const [crearError, setCrearError] = useState<string | null>(null);
  const [editarErrorMsg, setEditarErrorMsg] = useState<string | null>(null);
  const [crearKey, setCrearKey] = useState(0);
  const [pending, startTransition] = useTransition();

  function cerrarModal() {
    setEditando(null);
    setEditarErrorMsg(null);
  }

  function onCrear(formData: FormData) {
    setCrearError(null);
    startTransition(async () => {
      const resultado: UsuarioActionResult = await crearUsuario(formData);
      if (resultado?.error) {
        setCrearError(resultado.error);
        return;
      }
      setCrearKey((k) => k + 1);
    });
  }

  function onEditar(formData: FormData) {
    setEditarErrorMsg(null);
    startTransition(async () => {
      const resultado: UsuarioActionResult = await editarUsuario(formData);
      if (resultado?.error) {
        setEditarErrorMsg(resultado.error);
        return;
      }
      cerrarModal();
    });
  }

  function onToggle(id: number) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", String(id));
      await toggleUsuarioActivo(fd);
    });
  }

  return (
    <>
      <Card>
        <h2 className="text-base font-semibold mb-4">Nuevo usuario</h2>
        <form key={crearKey} action={onCrear} className="grid sm:grid-cols-2 gap-4 items-start">
          <Input label="Usuario" name="usuario" placeholder="nombre.usuario" required />
          <Input
            label="Contraseña"
            name="password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            required
            minLength={6}
          />
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-sm text-[var(--black-100)]">Accesos</span>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="puedeAdmin" value="1" /> Admin
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="puedeTaquilla" value="1" /> Taquilla
            </label>
          </div>
          <SedesSelector sedes={sedes} idPrefix="crear" />
          {crearError && (
            <p className="sm:col-span-2 text-sm text-[var(--error-150)]">{crearError}</p>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Creando…" : "Crear"}
            </Button>
          </div>
        </form>
      </Card>

      <Table>
        <thead>
          <tr>
            <Th>Usuario</Th>
            <Th>Capacidades</Th>
            <Th>Sucursales</Th>
            <Th>Estado</Th>
            <Th>Acciones</Th>
          </tr>
        </thead>
        <tbody>
          {usuarios.length === 0 && (
            <tr>
              <Td colSpan={5} className="text-center text-[var(--black-60)]">
                Aún no hay usuarios registrados.
              </Td>
            </tr>
          )}
          {usuarios.map((usr) => {
            const todasLasSedes = sedes.length > 0 && usr.sedeIds.length === sedes.length;
            return (
              <tr key={usr.id}>
                <Td className="font-semibold">{usr.usuario}</Td>
                <Td>
                  <div className="flex gap-1.5">
                    {usr.puedeAdmin && <Badge tone="info">Admin</Badge>}
                    {usr.puedeTaquilla && <Badge tone="brand">Taquilla</Badge>}
                  </div>
                </Td>
                <Td>
                  {usr.puedeTaquilla ? (
                    todasLasSedes ? (
                      "Todas"
                    ) : usr.sedes.length > 0 ? (
                      usr.sedes.join(", ")
                    ) : (
                      <span className="text-[var(--black-40)]">Sin sucursales</span>
                    )
                  ) : (
                    <span className="text-[var(--black-40)]">—</span>
                  )}
                </Td>
                <Td>
                  <Badge tone={usr.activo ? "success" : "neutral"}>
                    {usr.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="text-xs px-3 py-1.5"
                      onClick={() => {
                        setEditarErrorMsg(null);
                        setEditando(usr);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant={usr.activo ? "danger" : "secondary"}
                      className="text-xs px-3 py-1.5"
                      disabled={pending}
                      onClick={() => onToggle(usr.id)}
                    >
                      {usr.activo ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <Modal open={editando !== null} onClose={cerrarModal} title="Editar usuario">
        {editando && (
          <form action={onEditar} className="space-y-3">
            <input type="hidden" name="id" value={editando.id} />
            <Input label="Usuario" name="usuario" defaultValue={editando.usuario} required />
            <Input
              label="Nueva contraseña (opcional)"
              name="password"
              type="password"
              placeholder="Dejar en blanco para no cambiar"
              minLength={6}
            />
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-sm text-[var(--black-100)]">Accesos</span>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="puedeAdmin" value="1" defaultChecked={editando.puedeAdmin} /> Admin
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="puedeTaquilla" value="1" defaultChecked={editando.puedeTaquilla} /> Taquilla
              </label>
            </div>
            <SedesSelector
              sedes={sedes}
              idPrefix={`editar-${editando.id}`}
              initialSelectedIds={editando.sedeIds}
            />
            {editarErrorMsg && <p className="text-sm text-[var(--error-150)]">{editarErrorMsg}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={cerrarModal} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={pending}>
                {pending ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
