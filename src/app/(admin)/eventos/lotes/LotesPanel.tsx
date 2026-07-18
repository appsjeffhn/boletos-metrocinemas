"use client";
import { useId, useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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
import styles from "./lotes.module.css";

type Empresa = { id: number; nombre: string };
type Sede = { id: number; nombre: string; activo: boolean };

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

  const seleccionables = sedes.filter((s) => s.activo || initialSelectedIds.includes(s.id));

  return (
    <div className="flex flex-col gap-2">
      <span className="font-semibold text-sm text-[var(--black-100)]">Complejos</span>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="todas" value="1" checked={todas} onChange={(e) => setTodas(e.target.checked)} />
        Todos los complejos
      </label>
      {seleccionables.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pl-1">
          {seleccionables.map((s) => (
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
              {!s.activo && " (inactiva)"}
            </label>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--black-60)]">No hay complejos registrados.</p>
      )}
    </div>
  );
}

type FilaProducto = { productoId: number | null; nombre: string; detalle: string; precio: string; cantidad: string };
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
      if (filas[i]?.productoId === match.id) set(i, { nombre });
      else set(i, { nombre, productoId: match.id, detalle: match.detalle ?? "", precio: match.precio ?? "" });
    } else {
      set(i, { nombre, productoId: null });
    }
  }

  if (readOnly) {
    return (
      <div className="flex flex-col gap-2">
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
    <div className="flex flex-col gap-2">
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
            <Button type="button" variant="secondary" className="btn-sm"
              onClick={() => setFilas((prev) => (prev.length === 1 ? [nuevaFila()] : prev.filter((_, idx) => idx !== i)))}>
              ✕
            </Button>
          </div>
        </div>
      ))}
      <div>
        <Button type="button" variant="secondary" className="btn-sm" onClick={() => setFilas((prev) => [...prev, nuevaFila()])}>
          + Agregar producto
        </Button>
      </div>
    </div>
  );
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fmtFecha(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d} ${MESES[Number(m) - 1] ?? ""}`;
}
function venceInfo(hoy: string, venc: string): { cls: string; label: string } {
  const dias = Math.round((Date.parse(venc) - Date.parse(hoy)) / 86400000);
  if (dias < 0) return { cls: styles.semr, label: `Venció ${fmtFecha(venc)}` };
  if (dias === 0) return { cls: styles.sema, label: "Vence hoy" };
  if (dias <= 7) return { cls: styles.sema, label: `Vence en ${dias} día${dias === 1 ? "" : "s"}` };
  return { cls: styles.semg, label: `Vence ${fmtFecha(venc)}` };
}
const Dots = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.7" fill="currentColor" /><circle cx="12" cy="12" r="1.7" fill="currentColor" /><circle cx="19" cy="12" r="1.7" fill="currentColor" /></svg>
);

export function LotesPanel({
  lotes,
  empresas,
  sedes,
  catalogo,
  productosPorLote,
  hoy,
}: {
  lotes: LoteListado[];
  empresas: Empresa[];
  sedes: Sede[];
  catalogo: ProductoCatalogo[];
  productosPorLote: Record<number, ProductoDeLote[]>;
  hoy: string;
}) {
  const [vista, setVista] = useState<"cards" | "tabla">("cards");
  const [filtro, setFiltro] = useState("");
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [creando, setCreando] = useState(false);
  const [crearError, setCrearError] = useState<string | null>(null);
  const [crearKey, setCrearKey] = useState(0);
  const [anulando, setAnulando] = useState<LoteListado | null>(null);
  const [anularError, setAnularError] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [editando, setEditando] = useState<LoteListado | null>(null);
  const [editarError, setEditarError] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<LoteListado | null>(null);
  const [eliminarError, setEliminarError] = useState<string | null>(null);
  const [editandoProd, setEditandoProd] = useState<LoteListado | null>(null);
  const [editarProdError, setEditarProdError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onCrear(formData: FormData) {
    setCrearError(null);
    startTransition(async () => {
      const r: LoteActionResult = await crearLoteAction(formData);
      if (r?.error) { setCrearError(r.error); return; }
      setCrearKey((k) => k + 1);
      setCreando(false);
    });
  }
  function cerrarAnular() { setAnulando(null); setAnularError(null); setMotivo(""); }
  function onAnular(formData: FormData) {
    setAnularError(null);
    startTransition(async () => {
      const r: LoteActionResult = await anularLoteAction(formData);
      if (r?.error) { setAnularError(r.error); return; }
      cerrarAnular();
    });
  }
  function cerrarEditar() { setEditando(null); setEditarError(null); }
  function onEditar(formData: FormData) {
    setEditarError(null);
    startTransition(async () => {
      const r: LoteActionResult = await editarLoteAction(formData);
      if (r?.error) { setEditarError(r.error); return; }
      cerrarEditar();
    });
  }
  function onEditarProductos(formData: FormData) {
    setEditarProdError(null);
    startTransition(async () => {
      const r: LoteActionResult = await editarProductosLoteAction(formData);
      if (r?.error) { setEditarProdError(r.error); return; }
      setEditandoProd(null);
    });
  }
  function cerrarEliminar() { setEliminando(null); setEliminarError(null); }
  function onEliminar(formData: FormData) {
    setEliminarError(null);
    startTransition(async () => {
      const r: LoteActionResult = await eliminarLoteAction(formData);
      if (r?.error) { setEliminarError(r.error); return; }
      cerrarEliminar();
    });
  }

  const q = filtro.trim().toLowerCase();
  const lista = q
    ? lotes.filter((l) => l.empresa.toLowerCase().includes(q) || l.descripcion.toLowerCase().includes(q))
    : lotes;

  function menuNode(l: LoteListado, full: boolean) {
    const open = menuFor === l.id;
    return (
      <div className={styles.menuWrap}>
        <button type="button" className={styles.icobtn} aria-label="Acciones" onClick={() => setMenuFor(open ? null : l.id)}>
          <Dots />
        </button>
        {open && (
          <>
            <div className={styles.backdrop} onClick={() => setMenuFor(null)} />
            <div className={styles.menu}>
              {full && (
                <>
                  <a href={`/api/lote/${l.id}/pdf`}>Imprimir / PDF</a>
                  <a href={`/api/lote/${l.id}/qr-zip`}>Descargar QR (ZIP)</a>
                  <hr />
                </>
              )}
              {!l.anulado && !l.tieneCanjes && (
                <button type="button" onClick={() => { setMenuFor(null); setEditarError(null); setEditando(l); }}>Editar</button>
              )}
              <button type="button" onClick={() => { setMenuFor(null); setEditarProdError(null); setEditandoProd(l); }}>Productos</button>
              {!l.anulado && (
                <button type="button" className={styles.danger} onClick={() => { setMenuFor(null); setAnularError(null); setAnulando(l); }}>Anular</button>
              )}
              {!l.tieneCanjes && (
                <button type="button" className={styles.danger} onClick={() => { setMenuFor(null); setEliminarError(null); setEliminando(l); }}>Eliminar</button>
              )}
              {l.tieneCanjes && <p className={styles.note}>Con canjes: no editable ni eliminable</p>}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.search}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" /><path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          <input placeholder="Buscar lote o empresa…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        </div>
        <div className={styles.seg}>
          <button type="button" className={vista === "cards" ? styles.on : ""} onClick={() => setVista("cards")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" /><rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" /><rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" /><rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" /></svg>
            Tarjetas
          </button>
          <button type="button" className={vista === "tabla" ? styles.on : ""} onClick={() => setVista("tabla")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            Tabla
          </button>
        </div>
        <Button variant="primary" onClick={() => { setCrearError(null); setCreando(true); }}>+ Nuevo lote</Button>
      </div>

      {lista.length === 0 ? (
        <Card><p className={styles.empty}>{q ? "Ningún lote coincide con la búsqueda." : "Aún no hay lotes generados."}</p></Card>
      ) : vista === "cards" ? (
        <div className={styles.grid}>
          {lista.map((l) => {
            const pct = l.cantidad > 0 ? Math.round((l.canjeados / l.cantidad) * 100) : 0;
            const vi = venceInfo(hoy, l.fechaVencimiento);
            return (
              <Card key={l.id}>
                <div className={styles.ltop}>
                  <div><div className={styles.emp}>{l.empresa}</div><div className={styles.desc}>{l.descripcion}</div></div>
                  {l.anulado ? <Badge tone="error">Anulado</Badge> : <Badge tone="success">Activo</Badge>}
                </div>
                <div className={styles.meta}>
                  <span>{l.cantidad} boletos</span><span>·</span>
                  <span className={`${styles.sem} ${vi.cls}`} />{vi.label}
                </div>
                <div className={styles.prog}>
                  <div className={styles.progLab}><span>Canjeados</span><span>{l.canjeados} / {l.cantidad}</span></div>
                  <div className={styles.track}><div className={`${styles.fill} ${l.anulado ? styles.fillMuted : ""}`} style={{ width: `${pct}%` }} /></div>
                </div>
                <div className={styles.chips}>
                  {l.sedes.length === 0
                    ? <span className={`${styles.chip} ${styles.chipN}`}>Todos los complejos</span>
                    : l.sedes.map((s) => <span key={s} className={styles.chip}>{s}</span>)}
                </div>
                <div className={styles.acts}>
                  <a href={`/api/lote/${l.id}/pdf`} className="btn btn-secondary btn-sm">Imprimir</a>
                  <a href={`/api/lote/${l.id}/qr-zip`} className="btn btn-secondary btn-sm">QR</a>
                  <span className={styles.actSpacer} />
                  {menuNode(l, false)}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className={`card ${styles.list}`}>
          <div className={`${styles.trow} ${styles.thead}`}>
            <span>Lote</span><span>Progreso</span><span className={styles.tHideSm}>Vence</span><span className={styles.tHideSm}>Estado</span><span />
          </div>
          {lista.map((l) => {
            const pct = l.cantidad > 0 ? Math.round((l.canjeados / l.cantidad) * 100) : 0;
            const vi = venceInfo(hoy, l.fechaVencimiento);
            return (
              <div className={`${styles.trow} ${styles.trowBody}`} key={l.id}>
                <div className={styles.lname}><b>{l.descripcion}</b><span>{l.empresa}</span></div>
                <div className={styles.tprog}>
                  <span className={styles.track}><span className={`${styles.fill} ${l.anulado ? styles.fillMuted : ""}`} style={{ width: `${pct}%` }} /></span>
                  <small>{l.canjeados}/{l.cantidad}</small>
                </div>
                <div className={styles.tHideSm}><span className={`${styles.sem} ${vi.cls}`} /> {fmtFecha(l.fechaVencimiento)}</div>
                <div className={styles.tHideSm}>{l.anulado ? <Badge tone="error">Anulado</Badge> : <Badge tone="success">Activo</Badge>}</div>
                <div className={styles.center}>{menuNode(l, true)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Nuevo lote */}
      <Modal open={creando} onClose={() => setCreando(false)} title="Nuevo lote" size="lg">
        <form key={crearKey} action={onCrear} className="space-y-3">
          <Select label="Empresa" name="empresaId" required>
            <option value="">Selecciona…</option>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </Select>
          <Input label="Descripción" name="descripcion" placeholder="ej. Cortesías agosto" required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Cantidad" name="cantidad" type="number" min="1" placeholder="Cantidad" required />
            <Input label="Vencimiento" name="fechaVencimiento" type="date" required />
          </div>
          <SedesSelector sedes={sedes} />
          <ProductosEditor catalogo={catalogo} />
          {crearError && <p className="text-sm text-[var(--error-150)]">{crearError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreando(false)} disabled={pending}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={pending}>{pending ? "Generando…" : "Generar lote"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={anulando !== null} onClose={cerrarAnular} title="Anular lote">
        {anulando && (
          <form action={onAnular} className="space-y-3">
            <input type="hidden" name="loteId" value={anulando.id} />
            <p className="text-sm">Lote <strong>{anulando.descripcion}</strong> ({anulando.empresa}) — {anulando.cantidad} boletos.</p>
            <div className="text-sm p-3 rounded-[var(--radius-sm)]" style={{ background: "var(--error-10)", color: "var(--error-150)" }}>
              <strong>Esta acción NO se puede revertir.</strong> Todos los boletos activos de este lote quedarán inutilizables de inmediato.
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-[var(--black-100)]">Motivo de anulación</span>
              <textarea name="motivo" required rows={3} className="input" placeholder="Explica por qué se anula este lote…" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </label>
            {anularError && <p className="text-sm text-[var(--error-150)]">{anularError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={cerrarAnular} disabled={pending}>Cancelar</Button>
              <Button type="submit" variant="danger" disabled={pending || motivo.trim().length === 0}>{pending ? "Anulando…" : "Anular lote"}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={editando !== null} onClose={cerrarEditar} title="Editar lote">
        {editando && (
          <form key={editando.id} action={onEditar} className="space-y-3">
            <input type="hidden" name="loteId" value={editando.id} />
            <div className="text-sm p-3 rounded-[var(--radius-sm)]" style={{ background: "var(--warning-10)", color: "var(--warning-150)" }}>
              ⚠️ Al guardar, se regeneran los boletos: los QR generados anteriormente quedarán <strong>INVÁLIDOS</strong> y deberás reimprimir/redistribuir. Solo se puede editar un lote sin canjes.
            </div>
            <Input label="Descripción" name="descripcion" defaultValue={editando.descripcion} required />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Cantidad" name="cantidad" type="number" min="1" defaultValue={editando.cantidad} required />
              <Input label="Vencimiento" name="fechaVencimiento" type="date" defaultValue={editando.fechaVencimiento} required />
            </div>
            <SedesSelector sedes={sedes} initialTodas={editando.sedeIds.length === 0} initialSelectedIds={editando.sedeIds} />
            {editarError && <p className="text-sm text-[var(--error-150)]">{editarError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={cerrarEditar} disabled={pending}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={pending}>{pending ? "Guardando…" : "Guardar cambios"}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={eliminando !== null} onClose={cerrarEliminar} title="Eliminar lote">
        {eliminando && (
          <form action={onEliminar} className="space-y-3">
            <input type="hidden" name="loteId" value={eliminando.id} />
            <p className="text-sm">Lote <strong>{eliminando.descripcion}</strong> ({eliminando.empresa}) — {eliminando.cantidad} boletos.</p>
            <div className="text-sm p-3 rounded-[var(--radius-sm)]" style={{ background: "var(--error-10)", color: "var(--error-150)" }}>
              ¿Eliminar este lote? Se borrarán sus boletos. Esta acción no se puede deshacer. Solo se permite si el lote no tiene canjes.
            </div>
            {eliminarError && <p className="text-sm text-[var(--error-150)]">{eliminarError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={cerrarEliminar} disabled={pending}>Cancelar</Button>
              <Button type="submit" variant="danger" disabled={pending}>{pending ? "Eliminando…" : "Eliminar"}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={editandoProd !== null} onClose={() => setEditandoProd(null)} title="Productos del lote" size="lg">
        {editandoProd && (
          <form key={editandoProd.id} action={onEditarProductos} className="space-y-3">
            <input type="hidden" name="loteId" value={editandoProd.id} />
            <p className="text-sm">Lote <strong>{editandoProd.descripcion}</strong> ({editandoProd.empresa}). Editar productos <strong>no</strong> regenera los QR.</p>
            <ProductosEditor catalogo={catalogo} initial={productosPorLote[editandoProd.id] ?? []} readOnly={editandoProd.tieneCanjes} />
            {editarProdError && <p className="text-sm text-[var(--error-150)]">{editarProdError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditandoProd(null)} disabled={pending}>Cerrar</Button>
              {!editandoProd.tieneCanjes && (
                <Button type="submit" variant="primary" disabled={pending}>{pending ? "Guardando…" : "Guardar productos"}</Button>
              )}
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
