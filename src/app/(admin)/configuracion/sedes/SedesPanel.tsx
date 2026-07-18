"use client";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import type { SedeAdmin } from "@/domain/sedesQuery";
import { crearSedeAction, editarSedeAction, toggleSedeActivaAction, type SedeActionResult } from "./actions";
import styles from "@/components/collection.module.css";

const Dots = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.7" fill="currentColor" /><circle cx="12" cy="12" r="1.7" fill="currentColor" /><circle cx="19" cy="12" r="1.7" fill="currentColor" /></svg>
);

export function SedesPanel({ sedes }: { sedes: SedeAdmin[] }) {
  const [vista, setVista] = useState<"cards" | "tabla">("tabla");
  const [filtro, setFiltro] = useState("");
  const [fEstado, setFEstado] = useState<"todos" | "activa" | "inactiva">("todos");
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [creando, setCreando] = useState(false);
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
      setCreando(false);
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

  const q = filtro.trim().toLowerCase();
  const lista = sedes.filter((s) => {
    if (q && !s.nombre.toLowerCase().includes(q)) return false;
    if (fEstado === "activa" && !s.activo) return false;
    if (fEstado === "inactiva" && s.activo) return false;
    return true;
  });

  function menuNode(s: SedeAdmin) {
    const open = menuFor === s.id;
    return (
      <div className={styles.menuWrap}>
        <button type="button" className={styles.icobtn} aria-label="Acciones" onClick={() => setMenuFor(open ? null : s.id)}>
          <Dots />
        </button>
        {open && (
          <>
            <div className={styles.backdrop} onClick={() => setMenuFor(null)} />
            <div className={styles.menu}>
              <button type="button" onClick={() => { setMenuFor(null); setEditarError(null); setEditando(s); }}>Editar</button>
              {s.activo ? (
                <button type="button" className={styles.danger} onClick={() => { setMenuFor(null); setAlternando(s); }}>Desactivar</button>
              ) : (
                <button type="button" onClick={() => { setMenuFor(null); setAlternando(s); }}>Activar</button>
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
          <input placeholder="Buscar sede…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        </div>
        <select className={styles.fsel} value={fEstado} onChange={(e) => setFEstado(e.target.value as typeof fEstado)} aria-label="Filtrar por estado">
          <option value="todos">Todas</option>
          <option value="activa">Activas</option>
          <option value="inactiva">Inactivas</option>
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
        <Button variant="primary" onClick={() => { setCrearError(null); setCreando(true); }}>+ Nueva sede</Button>
      </div>

      {lista.length === 0 ? (
        <Card><p className={styles.empty}>{q ? "Ninguna sede coincide con la búsqueda." : "Aún no hay sedes."}</p></Card>
      ) : vista === "cards" ? (
        <div className={styles.grid}>
          {lista.map((s) => (
            <Card key={s.id} className={styles.itemCard}>
              <div className={styles.top}>
                <div className={styles.title}>{s.nombre}</div>
                {s.activo ? <Badge tone="success">Activa</Badge> : <Badge tone="neutral">Inactiva</Badge>}
              </div>
              <div className={styles.acts}>
                <span className={styles.actSpacer} />
                {menuNode(s)}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className={`card ${styles.list}`}>
          <div className={`${styles.trow} ${styles.thead}`} style={{ gridTemplateColumns: "2fr 1fr 48px" }}>
            <span>Sede</span><span>Estado</span><span />
          </div>
          {lista.map((s) => (
            <div className={`${styles.trow} ${styles.trowBody}`} style={{ gridTemplateColumns: "2fr 1fr 48px" }} key={s.id}>
              <div className={styles.lname}><b>{s.nombre}</b></div>
              <div>{s.activo ? <Badge tone="success">Activa</Badge> : <Badge tone="neutral">Inactiva</Badge>}</div>
              <div className={styles.center}>{menuNode(s)}</div>
            </div>
          ))}
        </div>
      )}

      <Modal open={creando} onClose={() => setCreando(false)} title="Nueva sede">
        <form key={crearKey} action={onCrear} className="space-y-3">
          <Input label="Nombre" name="nombre" placeholder="ej. NOVACENTRO" required />
          {crearError && <p className="text-sm text-[var(--error-150)]">{crearError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreando(false)} disabled={pending}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={pending}>{pending ? "Agregando…" : "Agregar"}</Button>
          </div>
        </form>
      </Modal>

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
