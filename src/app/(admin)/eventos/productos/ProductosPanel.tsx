"use client";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import type { ProductoCatalogo } from "@/domain/productosQuery";
import {
  crearProductoAction, editarProductoAction, desactivarProductoAction, type ProductoActionResult,
} from "./actions";
import styles from "@/components/collection.module.css";

const Dots = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.7" fill="currentColor" /><circle cx="12" cy="12" r="1.7" fill="currentColor" /><circle cx="19" cy="12" r="1.7" fill="currentColor" /></svg>
);

function fmtPrecio(precio: string | null): string {
  return precio == null ? "—" : `L.${Number(precio).toFixed(2)}`;
}

export function ProductosPanel({ productos }: { productos: ProductoCatalogo[] }) {
  const [vista, setVista] = useState<"cards" | "tabla">("cards");
  const [filtro, setFiltro] = useState("");
  const [fEstado, setFEstado] = useState<"todos" | "activo" | "inactivo">("todos");
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [creando, setCreando] = useState(false);
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
      setCreando(false);
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

  const q = filtro.trim().toLowerCase();
  const lista = productos.filter((p) => {
    if (q && !p.nombre.toLowerCase().includes(q)) return false;
    if (fEstado === "activo" && !p.activo) return false;
    if (fEstado === "inactivo" && p.activo) return false;
    return true;
  });

  function menuNode(p: ProductoCatalogo) {
    const open = menuFor === p.id;
    return (
      <div className={styles.menuWrap}>
        <button type="button" className={styles.icobtn} aria-label="Acciones" onClick={() => setMenuFor(open ? null : p.id)}>
          <Dots />
        </button>
        {open && (
          <>
            <div className={styles.backdrop} onClick={() => setMenuFor(null)} />
            <div className={styles.menu}>
              <button type="button" onClick={() => { setMenuFor(null); setEditarError(null); setEditando(p); }}>Editar</button>
              {p.activo && (
                <button type="button" className={styles.danger} onClick={() => { setMenuFor(null); setDesactivarError(null); setDesactivando(p); }}>
                  Desactivar
                </button>
              )}
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
          <input placeholder="Buscar producto…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        </div>
        <select className={styles.fsel} value={fEstado} onChange={(e) => setFEstado(e.target.value as typeof fEstado)} aria-label="Filtrar por estado">
          <option value="todos">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
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
        <Button variant="primary" onClick={() => { setCrearError(null); setCreando(true); }}>+ Nuevo producto</Button>
      </div>

      {lista.length === 0 ? (
        <Card><p className={styles.empty}>{q ? "Ningún producto coincide con la búsqueda." : "Aún no hay productos."}</p></Card>
      ) : vista === "cards" ? (
        <div className={styles.grid}>
          {lista.map((p) => (
            <Card key={p.id} className={styles.itemCard}>
              <div className={styles.top}>
                <div>
                  <div className={styles.title}>{p.nombre}</div>
                </div>
                {p.activo ? <Badge tone="success">Activo</Badge> : <Badge tone="neutral">Inactivo</Badge>}
              </div>
              <div className={styles.meta}>{p.detalle ?? "Sin detalle"}</div>
              <div className={styles.price}>{fmtPrecio(p.precio)}</div>
              <div className={styles.acts}>
                <span className={styles.actSpacer} />
                {menuNode(p)}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className={`card ${styles.list}`}>
          <div className={`${styles.trow} ${styles.thead}`} style={{ gridTemplateColumns: "2fr 1fr 0.9fr 48px" }}>
            <span>Producto</span><span className={styles.tHideSm}>Precio</span><span className={styles.tHideSm}>Estado</span><span />
          </div>
          {lista.map((p) => (
            <div className={`${styles.trow} ${styles.trowBody}`} key={p.id} style={{ gridTemplateColumns: "2fr 1fr 0.9fr 48px" }}>
              <div className={styles.lname}><b>{p.nombre}</b><span>{p.detalle ?? "—"}</span></div>
              <div className={styles.tHideSm}>{fmtPrecio(p.precio)}</div>
              <div className={styles.tHideSm}>{p.activo ? <Badge tone="success">Activo</Badge> : <Badge tone="neutral">Inactivo</Badge>}</div>
              <div className={styles.center}>{menuNode(p)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Nuevo producto */}
      <Modal open={creando} onClose={() => setCreando(false)} title="Nuevo producto">
        <form key={crearKey} action={onCrear} className="space-y-3">
          <Input label="Nombre" name="nombre" placeholder="ej. Entrada 3D" required />
          <Input label="Detalle" name="detalle" placeholder="ej. Sala normal" />
          <Input label="Precio (L)" name="precio" type="number" min="0" step="0.01" placeholder="ej. 120.00" />
          {crearError && <p className="text-sm text-[var(--error-150)]">{crearError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreando(false)} disabled={pending}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={pending}>{pending ? "Agregando…" : "Agregar"}</Button>
          </div>
        </form>
      </Modal>

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
