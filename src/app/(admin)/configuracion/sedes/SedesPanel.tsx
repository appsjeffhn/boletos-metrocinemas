"use client";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Th, Td } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import type { SedeAdmin } from "@/domain/sedesQuery";
import { crearSedeAction, editarSedeAction, toggleSedeActivaAction, type SedeActionResult } from "./actions";

export function SedesPanel({ sedes }: { sedes: SedeAdmin[] }) {
  const [crearError, setCrearError] = useState<string | null>(null);
  const [crearKey, setCrearKey] = useState(0);
  const [editando, setEditando] = useState<SedeAdmin | null>(null);
  const [editarError, setEditarError] = useState<string | null>(null);
  const [alternando, setAlternando] = useState<SedeAdmin | null>(null);
  const [pending, startTransition] = useTransition();

  function onCrear(formData: FormData) {
    setCrearError(null);
    startTransition(async () => {
      const r: SedeActionResult = await crearSedeAction(formData);
      if (r?.error) { setCrearError(r.error); return; }
      setCrearKey((k) => k + 1);
    });
  }

  function onEditar(formData: FormData) {
    setEditarError(null);
    startTransition(async () => {
      const r: SedeActionResult = await editarSedeAction(formData);
      if (r?.error) { setEditarError(r.error); return; }
      setEditando(null);
    });
  }

  function onAlternar(formData: FormData) {
    startTransition(async () => {
      await toggleSedeActivaAction(formData);
      setAlternando(null);
    });
  }

  return (
    <>
      <Card>
        <h2 className="text-base font-semibold mb-4">Nueva sede</h2>
        <form key={crearKey} action={onCrear} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[12rem]">
            <Input label="Nombre" name="nombre" placeholder="ej. NOVACENTRO" required />
          </div>
          <Button type="submit" variant="primary" disabled={pending}>Agregar</Button>
        </form>
        {crearError && <p className="mt-2 text-sm text-[var(--error-150)]">{crearError}</p>}
      </Card>

      <Table>
        <thead>
          <tr><Th>Nombre</Th><Th>Estado</Th><Th>Acciones</Th></tr>
        </thead>
        <tbody>
          {sedes.length === 0 && (
            <tr><Td colSpan={3} className="text-center text-[var(--black-60)]">Aún no hay sedes.</Td></tr>
          )}
          {sedes.map((s) => (
            <tr key={s.id}>
              <Td className="font-semibold">{s.nombre}</Td>
              <Td>{s.activo ? <Badge tone="success">Activa</Badge> : <Badge tone="neutral">Inactiva</Badge>}</Td>
              <Td>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" className="text-xs px-3 py-1.5"
                    onClick={() => { setEditarError(null); setEditando(s); }}>Editar</Button>
                  <Button type="button" variant={s.activo ? "danger" : "secondary"} className="text-xs px-3 py-1.5"
                    onClick={() => setAlternando(s)}>{s.activo ? "Desactivar" : "Activar"}</Button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal open={editando !== null} onClose={() => setEditando(null)} title="Editar sede">
        {editando && (
          <form key={editando.id} action={onEditar} className="space-y-3">
            <input type="hidden" name="id" value={editando.id} />
            <Input label="Nombre" name="nombre" defaultValue={editando.nombre} required />
            {editarError && <p className="text-sm text-[var(--error-150)]">{editarError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditando(null)} disabled={pending}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={alternando !== null} onClose={() => setAlternando(null)} title={alternando?.activo ? "Desactivar sede" : "Activar sede"}>
        {alternando && (
          <form action={onAlternar} className="space-y-3">
            <input type="hidden" name="id" value={alternando.id} />
            <p className="text-sm">
              {alternando.activo
                ? <>¿Desactivar <strong>{alternando.nombre}</strong>? No aparecerá al asignar sedes a lotes/usuarios ni en taquilla; los datos históricos se conservan.</>
                : <>¿Activar <strong>{alternando.nombre}</strong>? Volverá a estar disponible para asignaciones.</>}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setAlternando(null)} disabled={pending}>Cancelar</Button>
              <Button type="submit" variant={alternando.activo ? "danger" : "primary"} disabled={pending}>
                {pending ? "Guardando…" : alternando.activo ? "Desactivar" : "Activar"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
