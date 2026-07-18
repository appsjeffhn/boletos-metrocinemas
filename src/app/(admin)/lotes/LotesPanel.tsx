"use client";
import { useId, useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Th, Td } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import type { LoteListado } from "@/domain/lotesQuery";
import type { ProductoCatalogo } from "@/domain/productosQuery";
import type { ProductoDeLote } from "@/domain/loteProductosQuery";
import {
  anularLoteAction,
  crearLoteAction,
  editarLoteAction,
  eliminarLoteAction,
  editarProductosLoteAction,
  type LoteActionResult,
} from "./actions";

type Empresa = { id: number; nombre: string };
type Sede = { id: number; nombre: string };

function SedesSelector({
  sedes,
  initialTodas = true,
  initialSelectedIds = [],
}: {
  sedes: Sede[];
  initialTodas?: boolean;
  initialSelectedIds?: number[];
}) {
  const [todas, setTodas] = useState(initialTodas);
  const [selected, setSelected] = useState<Set<number>>(new Set(initialSelectedIds));

  return (
    <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-5">
      <span className="font-semibold text-sm text-[var(--black-100)]">Complejos</span>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="todas"
          value="1"
          checked={todas}
          onChange={(e) => setTodas(e.target.checked)}
        />
        Todos los complejos
      </label>
      {sedes.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 pl-1">
          {sedes.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
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
        <p className="text-xs text-[var(--black-60)]">No hay complejos registrados.</p>
      )}
    </div>
  );
}

type FilaProducto = {
  productoId: number | null; nombre: string; detalle: string; precio: string; cantidad: string;
};

function nuevaFila(): FilaProducto {
  return { productoId: null, nombre: "", detalle: "", precio: "", cantidad: "1" };
}

function ProductosEditor({
  catalogo,
  initial,
  readOnly = false,
}: {
  catalogo: ProductoCatalogo[];
  initial?: ProductoDeLote[];
  readOnly?: boolean;
}) {
  const [filas, setFilas] = useState<FilaProducto[]>(
    initial && initial.length > 0
      ? initial.map((p) => ({
          productoId: p.productoId,
          nombre: p.nombre,
          detalle: p.detalle ?? "",
          precio: p.precioUnitario ?? "",
          cantidad: String(p.cantidadPorBoleto),
        }))
      : [nuevaFila()],
  );

  const datalistId = useId();

  function set(i: number, patch: Partial<FilaProducto>) {
    setFilas((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  function onNombre(i: number, nombre: string) {
    const match = catalogo.find((c) => c.nombre.toLowerCase() === nombre.trim().toLowerCase());
    if (match) {
      if (filas[i]?.productoId === match.id) {
        // Ya está vinculado a este producto: no pisar el precio/detalle que el
        // usuario haya personalizado para este lote; solo actualizar el texto.
        set(i, { nombre });
      } else {
        set(i, { nombre, productoId: match.id, detalle: match.detalle ?? "", precio: match.precio ?? "" });
      }
    } else {
      set(i, { nombre, productoId: null });
    }
  }

  if (readOnly) {
    return (
      <div className="sm:col-span-2 lg:col-span-5 flex flex-col gap-2">
        <span className="font-semibold text-sm text-[var(--black-100)]">Productos del lote</span>
        <div className="text-sm p-3 rounded-[var(--radius-sm)]" style={{ background: "var(--warning-10)", color: "var(--warning-150)" }}>
          El lote tiene canjes: los productos no se pueden modificar.
        </div>
        <ul className="text-sm list-disc pl-5">
          {(initial ?? []).map((p) => (
            <li key={p.id}>{p.nombre}{p.detalle ? ` · ${p.detalle}` : ""} · ×{p.cantidadPorBoleto} por boleto</li>
          ))}
          {(initial ?? []).length === 0 && <li className="list-none text-[var(--black-60)]">Sin productos.</li>}
        </ul>
      </div>
    );
  }

  return (
    <div className="sm:col-span-2 lg:col-span-5 flex flex-col gap-2">
      <span className="font-semibold text-sm text-[var(--black-100)]">Productos del lote</span>
      <datalist id={datalistId}>
        {catalogo.filter((c) => c.activo).map((c) => <option key={c.id} value={c.nombre} />)}
      </datalist>
      {filas.map((f, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
          <div className="sm:col-span-4">
            <Input label={i === 0 ? "Producto" : ""} list={datalistId} name="prodNombre"
              value={f.nombre} onChange={(e) => onNombre(i, e.target.value)} placeholder="ej. Entrada 3D" />
            <input type="hidden" name="prodProductoId" value={f.productoId ?? ""} />
          </div>
          <div className="sm:col-span-3">
            <Input label={i === 0 ? "Detalle" : ""} name="prodDetalle" value={f.detalle}
              onChange={(e) => set(i, { detalle: e.target.value })} placeholder="ej. Sala normal" />
          </div>
          <div className="sm:col-span-2">
            <Input label={i === 0 ? "Precio (L)" : ""} name="prodPrecio" type="number" min="0" step="0.01"
              value={f.precio} onChange={(e) => set(i, { precio: e.target.value })} placeholder="0.00" />
          </div>
          <div className="sm:col-span-2">
            <Input label={i === 0 ? "Cant./boleto" : ""} name="prodCantidad" type="number" min="1"
              value={f.cantidad} onChange={(e) => set(i, { cantidad: e.target.value })} />
          </div>
          <div className="sm:col-span-1">
            <Button type="button" variant="secondary" className="text-xs px-2 py-1.5"
              onClick={() => setFilas((prev) => prev.length === 1 ? [nuevaFila()] : prev.filter((_, idx) => idx !== i))}>
              ✕
            </Button>
          </div>
        </div>
      ))}
      <div>
        <Button type="button" variant="secondary" className="text-xs px-3 py-1.5"
          onClick={() => setFilas((prev) => [...prev, nuevaFila()])}>
          + Agregar producto
        </Button>
      </div>
    </div>
  );
}

export function LotesPanel({
  lotes,
  empresas,
  sedes,
  catalogo,
  productosPorLote,
}: {
  lotes: LoteListado[];
  empresas: Empresa[];
  sedes: Sede[];
  catalogo: ProductoCatalogo[];
  productosPorLote: Record<number, ProductoDeLote[]>;
}) {
  const [crearError, setCrearError] = useState<string | null>(null);
  const [crearKey, setCrearKey] = useState(0);
  const [anulando, setAnulando] = useState<LoteListado | null>(null);
  const [anularError, setAnularError] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [editando, setEditando] = useState<LoteListado | null>(null);
  const [editarError, setEditarError] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<LoteListado | null>(null);
  const [eliminarError, setEliminarError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onCrear(formData: FormData) {
    setCrearError(null);
    startTransition(async () => {
      const resultado: LoteActionResult = await crearLoteAction(formData);
      if (resultado?.error) {
        setCrearError(resultado.error);
        return;
      }
      setCrearKey((k) => k + 1);
    });
  }

  function cerrarAnular() {
    setAnulando(null);
    setAnularError(null);
    setMotivo("");
  }

  function onAnular(formData: FormData) {
    setAnularError(null);
    startTransition(async () => {
      const resultado: LoteActionResult = await anularLoteAction(formData);
      if (resultado?.error) {
        setAnularError(resultado.error);
        return;
      }
      cerrarAnular();
    });
  }

  function cerrarEditar() {
    setEditando(null);
    setEditarError(null);
  }

  function onEditar(formData: FormData) {
    setEditarError(null);
    startTransition(async () => {
      const resultado: LoteActionResult = await editarLoteAction(formData);
      if (resultado?.error) {
        setEditarError(resultado.error);
        return;
      }
      cerrarEditar();
    });
  }

  const [editandoProd, setEditandoProd] = useState<LoteListado | null>(null);
  const [editarProdError, setEditarProdError] = useState<string | null>(null);

  function onEditarProductos(formData: FormData) {
    setEditarProdError(null);
    startTransition(async () => {
      const r: LoteActionResult = await editarProductosLoteAction(formData);
      if (r?.error) { setEditarProdError(r.error); return; }
      setEditandoProd(null);
    });
  }

  function cerrarEliminar() {
    setEliminando(null);
    setEliminarError(null);
  }

  function onEliminar(formData: FormData) {
    setEliminarError(null);
    startTransition(async () => {
      const resultado: LoteActionResult = await eliminarLoteAction(formData);
      if (resultado?.error) {
        setEliminarError(resultado.error);
        return;
      }
      cerrarEliminar();
    });
  }

  return (
    <>
      <Card>
        <h2 className="text-base font-semibold mb-4">Nuevo lote</h2>
        <form key={crearKey} action={onCrear} className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-start">
          <Select label="Empresa" name="empresaId" required>
            <option value="">Selecciona…</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </Select>
          <Input label="Descripción" name="descripcion" placeholder="ej. Cortesías agosto" required />
          <Input label="Cantidad" name="cantidad" type="number" min="1" placeholder="Cantidad" required />
          <Input label="Vencimiento" name="fechaVencimiento" type="date" required />
          <SedesSelector sedes={sedes} />
          <ProductosEditor catalogo={catalogo} />
          {crearError && (
            <p className="sm:col-span-2 lg:col-span-5 text-sm text-[var(--error-150)]">{crearError}</p>
          )}
          <div className="sm:col-span-2 lg:col-span-5">
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Generando…" : "Generar"}
            </Button>
          </div>
        </form>
      </Card>

      <Table>
        <thead>
          <tr>
            <Th>Empresa</Th>
            <Th>Descripción</Th>
            <Th>Cant.</Th>
            <Th>Vence</Th>
            <Th>Complejos</Th>
            <Th>Estado</Th>
            <Th>Acciones</Th>
          </tr>
        </thead>
        <tbody>
          {lotes.length === 0 && (
            <tr>
              <Td colSpan={7} className="text-center text-[var(--black-60)]">
                Aún no hay lotes generados.
              </Td>
            </tr>
          )}
          {lotes.map((l) => (
            <tr key={l.id}>
              <Td className="font-semibold">{l.empresa}</Td>
              <Td>{l.descripcion}</Td>
              <Td>{l.cantidad}</Td>
              <Td>{l.fechaVencimiento}</Td>
              <Td>
                {l.sedes.length === 0 ? (
                  <Badge tone="neutral">Todos</Badge>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {l.sedes.map((s) => (
                      <Badge key={s} tone="brand">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
              </Td>
              <Td>
                {l.anulado ? (
                  <span title={l.anuladoMotivo ?? undefined} className="cursor-help">
                    <Badge tone="error">Anulado</Badge>
                  </span>
                ) : (
                  <Badge tone="success">Activo</Badge>
                )}
              </Td>
              <Td>
                <div className="flex flex-wrap gap-2">
                  <a
                    className="btn btn-secondary text-xs px-3 py-1.5"
                    href={`/api/lote/${l.id}/pdf`}
                  >
                    Imprimir/PDF
                  </a>
                  <a className="btn btn-secondary text-xs px-3 py-1.5" href={`/api/lote/${l.id}/qr-zip`}>
                    Descargar QR (ZIP)
                  </a>
                  {!l.anulado && !l.tieneCanjes && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="text-xs px-3 py-1.5"
                      onClick={() => {
                        setEditarError(null);
                        setEditando(l);
                      }}
                    >
                      Editar
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-xs px-3 py-1.5"
                    onClick={() => { setEditarProdError(null); setEditandoProd(l); }}
                  >
                    Productos
                  </Button>
                  {!l.tieneCanjes && (
                    <Button
                      type="button"
                      variant="danger"
                      className="text-xs px-3 py-1.5"
                      onClick={() => {
                        setEliminarError(null);
                        setEliminando(l);
                      }}
                    >
                      Eliminar
                    </Button>
                  )}
                  {!l.anulado && (
                    <Button
                      type="button"
                      variant="danger"
                      className="text-xs px-3 py-1.5"
                      onClick={() => {
                        setAnularError(null);
                        setAnulando(l);
                      }}
                    >
                      Anular
                    </Button>
                  )}
                  {l.tieneCanjes && (
                    <span className="text-xs text-[var(--black-60)] self-center">
                      Tiene canjes: no editable/eliminable
                    </span>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal open={anulando !== null} onClose={cerrarAnular} title="Anular lote">
        {anulando && (
          <form action={onAnular} className="space-y-3">
            <input type="hidden" name="loteId" value={anulando.id} />
            <p className="text-sm">
              Lote <strong>{anulando.descripcion}</strong> ({anulando.empresa}) — {anulando.cantidad} boletos.
            </p>
            <div
              className="text-sm p-3 rounded-[var(--radius-sm)]"
              style={{ background: "var(--error-10)", color: "var(--error-150)" }}
            >
              <strong>Esta acción NO se puede revertir.</strong> Todos los boletos activos de este
              lote quedarán inutilizables de inmediato.
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-[var(--black-100)]">Motivo de anulación</span>
              <textarea
                name="motivo"
                required
                rows={3}
                className="input"
                placeholder="Explica por qué se anula este lote…"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </label>
            {anularError && <p className="text-sm text-[var(--error-150)]">{anularError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={cerrarAnular} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" variant="danger" disabled={pending || motivo.trim().length === 0}>
                {pending ? "Anulando…" : "Anular lote"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={editando !== null} onClose={cerrarEditar} title="Editar lote">
        {editando && (
          <form key={editando.id} action={onEditar} className="space-y-3">
            <input type="hidden" name="loteId" value={editando.id} />
            <div
              className="text-sm p-3 rounded-[var(--radius-sm)]"
              style={{ background: "var(--warning-10)", color: "var(--warning-150)" }}
            >
              ⚠️ Al guardar, se regeneran los boletos: los QR generados anteriormente quedarán{" "}
              <strong>INVÁLIDOS</strong> y deberás reimprimir/redistribuir. Solo se puede editar un
              lote sin canjes.
            </div>
            <Input
              label="Descripción"
              name="descripcion"
              defaultValue={editando.descripcion}
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Cantidad"
                name="cantidad"
                type="number"
                min="1"
                defaultValue={editando.cantidad}
                required
              />
              <Input
                label="Vencimiento"
                name="fechaVencimiento"
                type="date"
                defaultValue={editando.fechaVencimiento}
                required
              />
            </div>
            <SedesSelector
              sedes={sedes}
              initialTodas={editando.sedeIds.length === 0}
              initialSelectedIds={editando.sedeIds}
            />
            {editarError && <p className="text-sm text-[var(--error-150)]">{editarError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={cerrarEditar} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={pending}>
                {pending ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={eliminando !== null} onClose={cerrarEliminar} title="Eliminar lote">
        {eliminando && (
          <form action={onEliminar} className="space-y-3">
            <input type="hidden" name="loteId" value={eliminando.id} />
            <p className="text-sm">
              Lote <strong>{eliminando.descripcion}</strong> ({eliminando.empresa}) —{" "}
              {eliminando.cantidad} boletos.
            </p>
            <div
              className="text-sm p-3 rounded-[var(--radius-sm)]"
              style={{ background: "var(--error-10)", color: "var(--error-150)" }}
            >
              ¿Eliminar este lote? Se borrarán sus boletos. Esta acción no se puede deshacer. Solo
              se permite si el lote no tiene canjes.
            </div>
            {eliminarError && <p className="text-sm text-[var(--error-150)]">{eliminarError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={cerrarEliminar} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" variant="danger" disabled={pending}>
                {pending ? "Eliminando…" : "Eliminar"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={editandoProd !== null} onClose={() => setEditandoProd(null)} title="Productos del lote" size="lg">
        {editandoProd && (
          <form key={editandoProd.id} action={onEditarProductos} className="space-y-3">
            <input type="hidden" name="loteId" value={editandoProd.id} />
            <p className="text-sm">
              Lote <strong>{editandoProd.descripcion}</strong> ({editandoProd.empresa}).
              Editar productos <strong>no</strong> regenera los QR.
            </p>
            <div className="grid grid-cols-1 gap-3">
              <ProductosEditor
                catalogo={catalogo}
                initial={productosPorLote[editandoProd.id] ?? []}
                readOnly={editandoProd.tieneCanjes}
              />
            </div>
            {editarProdError && <p className="text-sm text-[var(--error-150)]">{editarProdError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditandoProd(null)} disabled={pending}>
                Cerrar
              </Button>
              {!editandoProd.tieneCanjes && (
                <Button type="submit" variant="primary" disabled={pending}>
                  {pending ? "Guardando…" : "Guardar productos"}
                </Button>
              )}
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
