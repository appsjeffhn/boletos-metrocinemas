"use client";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Th, Td } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import type { ProductoCatalogo } from "@/domain/productosQuery";
import {
  crearProductoAction, editarProductoAction, desactivarProductoAction, type ProductoActionResult,
} from "./actions";

export function ProductosPanel({ productos }: { productos: ProductoCatalogo[] }) {
  const [crearError, setCrearError] = useState<string | null>(null);
  const [crearKey, setCrearKey] = useState(0);
  const [editando, setEditando] = useState<ProductoCatalogo | null>(null);
  const [editarError, setEditarError] = useState<string | null>(null);
  const [desactivando, setDesactivando] = useState<ProductoCatalogo | null>(null);
  const [desactivarError, setDesactivarError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onCrear(formData: FormData) {
    setCrearError(null);
    startTransition(async () => {
      const r: ProductoActionResult = await crearProductoAction(formData);
      if (r?.error) { setCrearError(r.error); return; }
      setCrearKey((k) => k + 1);
    });
  }

  function onEditar(formData: FormData) {
    setEditarError(null);
    startTransition(async () => {
      const r: ProductoActionResult = await editarProductoAction(formData);
      if (r?.error) { setEditarError(r.error); return; }
      setEditando(null);
    });
  }

  function onDesactivar(formData: FormData) {
    setDesactivarError(null);
    startTransition(async () => {
      const r: ProductoActionResult = await desactivarProductoAction(formData);
      if (r?.error) { setDesactivarError(r.error); return; }
      setDesactivando(null);
    });
  }

  return (
    <>
      <Card>
        <h2 className="text-base font-semibold mb-4">Nuevo producto</h2>
        <form key={crearKey} action={onCrear} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
          <Input label="Nombre" name="nombre" placeholder="ej. Entrada 3D" required />
          <Input label="Detalle" name="detalle" placeholder="ej. Sala normal" />
          <Input label="Precio (L)" name="precio" type="number" min="0" step="0.01" placeholder="ej. 120.00" />
          {crearError && <p className="sm:col-span-2 lg:col-span-4 text-sm text-[var(--error-150)]">{crearError}</p>}
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" variant="primary" disabled={pending}>Agregar</Button>
          </div>
        </form>
      </Card>

      <Table>
        <thead>
          <tr><Th>Nombre</Th><Th>Detalle</Th><Th>Precio</Th><Th>Estado</Th><Th>Acciones</Th></tr>
        </thead>
        <tbody>
          {productos.length === 0 && (
            <tr><Td colSpan={5} className="text-center text-[var(--black-60)]">Aún no hay productos.</Td></tr>
          )}
          {productos.map((p) => (
            <tr key={p.id}>
              <Td className="font-semibold">{p.nombre}</Td>
              <Td>{p.detalle ?? "—"}</Td>
              <Td>{p.precio == null ? "—" : `L.${Number(p.precio).toFixed(2)}`}</Td>
              <Td>{p.activo ? <Badge tone="success">Activo</Badge> : <Badge tone="neutral">Inactivo</Badge>}</Td>
              <Td>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" className="text-xs px-3 py-1.5"
                    onClick={() => { setEditarError(null); setEditando(p); }}>Editar</Button>
                  {p.activo && (
                    <Button type="button" variant="danger" className="text-xs px-3 py-1.5"
                      onClick={() => { setDesactivarError(null); setDesactivando(p); }}>
                      Desactivar
                    </Button>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal open={editando !== null} onClose={() => setEditando(null)} title="Editar producto">
        {editando && (
          <form key={editando.id} action={onEditar} className="space-y-3">
            <input type="hidden" name="id" value={editando.id} />
            <Input label="Nombre" name="nombre" defaultValue={editando.nombre} required />
            <Input label="Detalle" name="detalle" defaultValue={editando.detalle ?? ""} />
            <Input label="Precio (L)" name="precio" type="number" min="0" step="0.01"
              defaultValue={editando.precio ?? ""} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="activo" value="1" defaultChecked={editando.activo} /> Activo
            </label>
            {editarError && <p className="text-sm text-[var(--error-150)]">{editarError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditando(null)} disabled={pending}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={desactivando !== null} onClose={() => setDesactivando(null)} title="Desactivar producto">
        {desactivando && (
          <form action={onDesactivar} className="space-y-3">
            <input type="hidden" name="id" value={desactivando.id} />
            <p className="text-sm">
              ¿Desactivar <strong>{desactivando.nombre}</strong>? No aparecerá al armar nuevos lotes; puedes reactivarlo luego desde Editar.
            </p>
            {desactivarError && <p className="text-sm text-[var(--error-150)]">{desactivarError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setDesactivando(null)} disabled={pending}>Cancelar</Button>
              <Button type="submit" variant="danger" disabled={pending}>{pending ? "Desactivando…" : "Desactivar"}</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
