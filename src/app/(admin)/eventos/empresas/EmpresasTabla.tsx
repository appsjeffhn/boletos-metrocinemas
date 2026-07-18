"use client";
import { useState, useTransition } from "react";
import { Table, Th, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { editarEmpresa, eliminarEmpresa, type EmpresaActionResult } from "./actions";

type Empresa = {
  id: number;
  nombre: string;
  prefijo: string;
  contacto: string | null;
  telefono: string | null;
};

export function EmpresasTabla({ empresas }: { empresas: Empresa[] }) {
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [eliminando, setEliminando] = useState<Empresa | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function cerrarModales() {
    setEditando(null);
    setEliminando(null);
    setError(null);
  }

  function guardarEdicion(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const resultado: EmpresaActionResult = await editarEmpresa(formData);
      if (resultado?.error) {
        setError(resultado.error);
        return;
      }
      cerrarModales();
    });
  }

  function confirmarEliminar(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const resultado: EmpresaActionResult = await eliminarEmpresa(formData);
      if (resultado?.error) {
        setError(resultado.error);
        return;
      }
      cerrarModales();
    });
  }

  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th>Nombre</Th>
            <Th>Código</Th>
            <Th>Contacto</Th>
            <Th>Teléfono</Th>
            <Th>Acciones</Th>
          </tr>
        </thead>
        <tbody>
          {empresas.length === 0 && (
            <tr>
              <Td colSpan={5} className="text-center text-[var(--black-60)]">
                Aún no hay empresas registradas.
              </Td>
            </tr>
          )}
          {empresas.map((e) => (
            <tr key={e.id}>
              <Td className="font-semibold">{e.nombre}</Td>
              <Td>
                <span className="font-mono text-xs text-[var(--blue-hover)]">M{e.prefijo}-</span>
              </Td>
              <Td>{e.contacto || <span className="text-[var(--black-40)]">—</span>}</Td>
              <Td>{e.telefono || <span className="text-[var(--black-40)]">—</span>}</Td>
              <Td>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="btn-sm"
                    onClick={() => {
                      setError(null);
                      setEditando(e);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    className="btn-sm"
                    onClick={() => {
                      setError(null);
                      setEliminando(e);
                    }}
                  >
                    Eliminar
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal open={editando !== null} onClose={cerrarModales} title="Editar empresa">
        {editando && (
          <form action={guardarEdicion} className="space-y-3">
            <input type="hidden" name="id" value={editando.id} />
            <Input label="Nombre" name="nombre" defaultValue={editando.nombre} required />
            <Input
              label="Prefijo"
              name="prefijo"
              defaultValue={editando.prefijo}
              maxLength={6}
            />
            <p className="text-xs text-[var(--black-60)] -mt-2">
              Se antepone M; ej. MOK → MMOK-
            </p>
            <Input label="Contacto" name="contacto" defaultValue={editando.contacto ?? ""} />
            <Input label="Teléfono" name="telefono" defaultValue={editando.telefono ?? ""} />
            {error && <p className="text-sm text-[var(--error-150)]">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={cerrarModales} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={pending}>
                {pending ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={eliminando !== null} onClose={cerrarModales} title="Eliminar empresa">
        {eliminando && (
          <form action={confirmarEliminar} className="space-y-3">
            <input type="hidden" name="id" value={eliminando.id} />
            <p className="text-sm">
              ¿Eliminar la empresa <strong>{eliminando.nombre}</strong>? Esta acción no se puede
              deshacer.
            </p>
            {error && <p className="text-sm text-[var(--error-150)]">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={cerrarModales} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" variant="danger" disabled={pending}>
                {pending ? "Eliminando…" : "Eliminar"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
