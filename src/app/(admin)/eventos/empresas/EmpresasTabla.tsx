"use client";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { crearEmpresa, editarEmpresa, eliminarEmpresa, type EmpresaActionResult } from "./actions";
import styles from "@/components/collection.module.css";

type Empresa = {
  id: number;
  nombre: string;
  prefijo: string;
  contacto: string | null;
  telefono: string | null;
};

const Dots = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.7" fill="currentColor" /><circle cx="12" cy="12" r="1.7" fill="currentColor" /><circle cx="19" cy="12" r="1.7" fill="currentColor" /></svg>
);

export function EmpresasTabla({ empresas }: { empresas: Empresa[] }) {
  const [vista, setVista] = useState<"cards" | "tabla">("cards");
  const [filtro, setFiltro] = useState("");
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [creando, setCreando] = useState(false);
  const [crearKey, setCrearKey] = useState(0);
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [eliminando, setEliminando] = useState<Empresa | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function cerrarModales() {
    setEditando(null);
    setEliminando(null);
    setError(null);
  }

  function onCrear(formData: FormData) {
    startTransition(async () => {
      await crearEmpresa(formData);
      setCrearKey((k) => k + 1);
      setCreando(false);
    });
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

  const q = filtro.trim().toLowerCase();
  const lista = empresas.filter((e) => !q || e.nombre.toLowerCase().includes(q));

  function menuNode(e: Empresa) {
    const open = menuFor === e.id;
    return (
      <div className={styles.menuWrap}>
        <button type="button" className={styles.icobtn} aria-label="Acciones" aria-haspopup="menu" aria-expanded={open} onClick={() => setMenuFor(open ? null : e.id)}>
          <Dots />
        </button>
        {open && (
          <>
            <div className={styles.backdrop} onClick={() => setMenuFor(null)} />
            <div className={styles.menu} role="menu" onKeyDown={(e) => { if (e.key === "Escape") setMenuFor(null); }}>
              <button type="button" onClick={() => { setMenuFor(null); setError(null); setEditando(e); }}>Editar</button>
              <button type="button" className={styles.danger} onClick={() => { setMenuFor(null); setError(null); setEliminando(e); }}>Eliminar</button>
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
          <input aria-label="Buscar empresa" placeholder="Buscar empresa…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        </div>
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
        <Button variant="primary" onClick={() => setCreando(true)}>+ Nueva empresa</Button>
      </div>

      {lista.length === 0 ? (
        <Card><p className={styles.empty}>{q ? "Ninguna empresa coincide con la búsqueda." : "Aún no hay empresas registradas."}</p></Card>
      ) : vista === "cards" ? (
        <div className={styles.grid}>
          {lista.map((e) => (
            <Card key={e.id} className={styles.itemCard}>
              <div className={styles.top}>
                <div>
                  <div className={styles.eyebrow}>M{e.prefijo}-</div>
                  <div className={styles.title}>{e.nombre}</div>
                </div>
              </div>
              <div className={styles.meta}>
                <span>{e.contacto || "—"}</span>
                <span>·</span>
                <span>{e.telefono || "—"}</span>
              </div>
              <div className={styles.acts}>
                <span className={styles.actSpacer} />
                {menuNode(e)}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className={`card ${styles.list}`} role="table" aria-label="Empresas">
          <div className={`${styles.trow} ${styles.thead}`} style={{ gridTemplateColumns: "2fr 1.2fr 1fr 48px" }} role="row">
            <span role="columnheader">Empresa</span>
            <span className={styles.tHideSm} role="columnheader">Contacto</span>
            <span className={styles.tHideSm} role="columnheader">Teléfono</span>
            <span role="columnheader" />
          </div>
          {lista.map((e) => (
            <div className={`${styles.trow} ${styles.trowBody}`} style={{ gridTemplateColumns: "2fr 1.2fr 1fr 48px" }} key={e.id} role="row">
              <div className={styles.lname} role="cell"><b>{e.nombre}</b><span>M{e.prefijo}-</span></div>
              <div className={styles.tHideSm} role="cell">{e.contacto || "—"}</div>
              <div className={styles.tHideSm} role="cell">{e.telefono || "—"}</div>
              <div className={styles.center} role="cell">{menuNode(e)}</div>
            </div>
          ))}
        </div>
      )}

      <Modal open={creando} onClose={() => setCreando(false)} title="Nueva empresa">
        <form key={crearKey} action={onCrear} className="space-y-3">
          <Input label="Nombre" name="nombre" placeholder="Nombre de la empresa" required />
          <div className="flex flex-col gap-1">
            <Input label="Prefijo (opcional)" name="prefijo" placeholder="ej. MOK" maxLength={6} />
            <p className="text-xs text-[var(--black-60)]">
              Se antepone M; ej. MOK → MMOK-
            </p>
          </div>
          <Input label="Contacto" name="contacto" placeholder="Nombre de contacto" />
          <Input label="Teléfono" name="telefono" placeholder="Teléfono" />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreando(false)} disabled={pending}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={pending}>{pending ? "Agregando…" : "Agregar"}</Button>
          </div>
        </form>
      </Modal>

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
