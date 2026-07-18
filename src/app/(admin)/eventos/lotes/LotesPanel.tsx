"use client";
import { useId, useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { RowMenu } from "@/components/RowMenu";
import type { LoteListado } from "@/domain/lotesQuery";
import type { ProductoCatalogo } from "@/domain/productosQuery";
import type { ProductoDeLote } from "@/domain/loteProductosQuery";
import {
  anularLoteAction,
  crearLoteAction,
  editarLoteAction,
  eliminarLoteAction,
  editarProductosLoteAction,
  crearEmpresaRapidaAction,
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
  const [fEstado, setFEstado] = useState<"todos" | "activo" | "anulado">("todos");
  const [fVenc, setFVenc] = useState<"todos" | "pronto" | "vencido">("todos");
  const [creando, setCreando] = useState(false);
  const [empresasState, setEmpresasState] = useState<Empresa[]>(empresas);
  const [empresaSel, setEmpresaSel] = useState("");
  const [nuevoCli, setNuevoCli] = useState(false);
  const [cliNombre, setCliNombre] = useState("");
  const [cliPrefijo, setCliPrefijo] = useState("");
  const [cliError, setCliError] = useState<string | null>(null);
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
      setEmpresaSel("");
      setNuevoCli(false);
    });
  }

  function crearCliente() {
    setCliError(null);
    startTransition(async () => {
      const r = await crearEmpresaRapidaAction(cliNombre, cliPrefijo);
      if ("error" in r) { setCliError(r.error); return; }
      setEmpresasState((prev) => [...prev, { id: r.id, nombre: r.nombre }].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setEmpresaSel(String(r.id));
      setNuevoCli(false);
      setCliNombre("");
      setCliPrefijo("");
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
  const lista = lotes.filter((l) => {
    if (q && !(l.empresa.toLowerCase().includes(q) || l.descripcion.toLowerCase().includes(q))) return false;
    if (fEstado === "activo" && l.anulado) return false;
    if (fEstado === "anulado" && !l.anulado) return false;
    if (fVenc !== "todos") {
      const dias = Math.round((Date.parse(l.fechaVencimiento) - Date.parse(hoy)) / 86400000);
      if (fVenc === "vencido" && dias >= 0) return false;
      if (fVenc === "pronto" && !(dias >= 0 && dias <= 7)) return false;
    }
    return true;
  });

  function menuNode(l: LoteListado, full: boolean) {
    return (
      <RowMenu>
        {(close) => (
          <>
            {full && (
              <>
                <a href={`/api/lote/${l.id}/pdf`} role="menuitem">Imprimir / PDF</a>
                <a href={`/api/lote/${l.id}/qr-zip`} role="menuitem">Descargar QR (ZIP)</a>
                <hr />
              </>
            )}
            {!l.anulado && !l.tieneCanjes && (
              <button type="button" role="menuitem" onClick={() => { close(); setEditarError(null); setEditando(l); }}>Editar</button>
            )}
            <button type="button" role="menuitem" onClick={() => { close(); setEditarProdError(null); setEditandoProd(l); }}>Productos</button>
            {!l.anulado && (
              <button type="button" role="menuitem" className={styles.danger} onClick={() => { close(); setAnularError(null); setAnulando(l); }}>Anular</button>
            )}
            {!l.tieneCanjes && (
              <button type="button" role="menuitem" className={styles.danger} onClick={() => { close(); setEliminarError(null); setEliminando(l); }}>Eliminar</button>
            )}
            {l.tieneCanjes && <p className={styles.note}>Con canjes: no editable ni eliminable</p>}
          </>
        )}
      </RowMenu>
    );
  }

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.search}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" /><path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          <input aria-label="Buscar lote o empresa" placeholder="Buscar lote o empresa…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        </div>
        <select className={styles.fsel} value={fEstado} onChange={(e) => setFEstado(e.target.value as typeof fEstado)} aria-label="Filtrar por estado">
          <option value="todos">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="anulado">Anulados</option>
        </select>
        <select className={styles.fsel} value={fVenc} onChange={(e) => setFVenc(e.target.value as typeof fVenc)} aria-label="Filtrar por vencimiento">
          <option value="todos">Cualquier vencimiento</option>
          <option value="pronto">Por vencer (≤7 días)</option>
          <option value="vencido">Vencidos</option>
        </select>
        <span className={styles.spacer} />
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
              <Card key={l.id} className={styles.loteCard}>
                <div className={styles.ltop}>
                  <div><div className={styles.emp}>{l.empresa}</div><div className={styles.desc}>{l.descripcion}</div></div>
                  {l.anulado ? <span title={l.anuladoMotivo ?? undefined} className="cursor-help"><Badge tone="error">Anulado</Badge></span> : <Badge tone="success">Activo</Badge>}
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
        <div className={`card ${styles.list}`} role="table" aria-label="Lotes">
          <div className={`${styles.trow} ${styles.thead}`} role="row">
            <span role="columnheader">Lote</span><span role="columnheader">Progreso</span><span role="columnheader" className={styles.tHideSm}>Vence</span><span role="columnheader" className={styles.tHideSm}>Estado</span><span role="columnheader" />
          </div>
          {lista.map((l) => {
            const pct = l.cantidad > 0 ? Math.round((l.canjeados / l.cantidad) * 100) : 0;
            const vi = venceInfo(hoy, l.fechaVencimiento);
            return (
              <div className={`${styles.trow} ${styles.trowBody}`} key={l.id} role="row">
                <div role="cell" className={styles.lname}><b>{l.descripcion}</b><span>{l.empresa}</span></div>
                <div role="cell" className={styles.tprog}>
                  <span className={styles.track}><span className={`${styles.fill} ${l.anulado ? styles.fillMuted : ""}`} style={{ width: `${pct}%` }} /></span>
                  <small>{l.canjeados}/{l.cantidad}</small>
                </div>
                <div role="cell" className={styles.tHideSm}><span className={`${styles.sem} ${vi.cls}`} /> {fmtFecha(l.fechaVencimiento)}</div>
                <div role="cell" className={styles.tHideSm}>{l.anulado ? <span title={l.anuladoMotivo ?? undefined} className="cursor-help"><Badge tone="error">Anulado</Badge></span> : <Badge tone="success">Activo</Badge>}</div>
                <div role="cell" className={styles.center}>{menuNode(l, true)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Nuevo lote */}
      <Modal open={creando} onClose={() => setCreando(false)} title="Nuevo lote" size="lg">
        <form key={crearKey} action={onCrear} className="space-y-3">
          <div className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-[var(--black-100)]">Empresa (cliente)</span>
            <div className="flex gap-2 items-center">
              <select name="empresaId" required value={empresaSel} onChange={(e) => setEmpresaSel(e.target.value)} className="input">
                <option value="">Selecciona…</option>
                {empresasState.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
              <button type="button" className="btn btn-secondary btn-sm shrink-0" onClick={() => { setNuevoCli((v) => !v); setCliError(null); }}>
                {nuevoCli ? "Cancelar" : "+ Nuevo"}
              </button>
            </div>
            {nuevoCli && (
              <div className="mt-1 p-3 rounded-[var(--radius-sm)] flex flex-col gap-2" style={{ background: "var(--black-10)" }}>
                <Input label="Nombre del cliente" value={cliNombre} onChange={(e) => setCliNombre(e.target.value)} placeholder="ej. Coca-Cola" />
                <Input label="Prefijo (opcional)" value={cliPrefijo} onChange={(e) => setCliPrefijo(e.target.value)} placeholder="ej. CC" maxLength={6} />
                {cliError && <p className="text-sm text-[var(--error-150)]">{cliError}</p>}
                <div>
                  <Button type="button" variant="gold" size="sm" onClick={crearCliente} disabled={pending || cliNombre.trim().length === 0}>
                    {pending ? "Creando…" : "Crear cliente"}
                  </Button>
                </div>
              </div>
            )}
          </div>
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
