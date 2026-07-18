"use client";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import type { UsuarioListado } from "@/domain/usuariosQuery";
import { crearUsuario, editarUsuario, toggleUsuarioActivo, type UsuarioActionResult } from "./actions";
import styles from "@/components/collection.module.css";

type Sede = { id: number; nombre: string; activo: boolean };

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

  // Mostrar activas + cualquiera ya asignada (aunque esté inactiva), para que
  // las sucursales inactivas ya asignadas no se pierdan silenciosamente al editar.
  const seleccionables = sedes.filter((s) => s.activo || initialSelectedIds.includes(s.id));

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
      {seleccionables.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pl-1">
          {seleccionables.map((s) => (
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
              {!s.activo && " (inactiva)"}
            </label>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--black-60)]">No hay sucursales registradas.</p>
      )}
    </div>
  );
}

const Dots = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="5" cy="12" r="1.7" fill="currentColor" />
    <circle cx="12" cy="12" r="1.7" fill="currentColor" />
    <circle cx="19" cy="12" r="1.7" fill="currentColor" />
  </svg>
);

export function UsuariosPanel({ usuarios, sedes }: { usuarios: UsuarioListado[]; sedes: Sede[] }) {
  const [vista, setVista] = useState<"cards" | "tabla">("cards");
  const [filtro, setFiltro] = useState("");
  const [fEstado, setFEstado] = useState<"todos" | "activo" | "inactivo">("todos");
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [creando, setCreando] = useState(false);
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
      setCreando(false);
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

  const q = filtro.trim().toLowerCase();
  const lista = usuarios.filter((u) => {
    if (q && !u.usuario.toLowerCase().includes(q)) return false;
    if (fEstado === "activo" && !u.activo) return false;
    if (fEstado === "inactivo" && u.activo) return false;
    return true;
  });

  function menuNode(u: UsuarioListado) {
    const open = menuFor === u.id;
    return (
      <div className={styles.menuWrap}>
        <button
          type="button"
          className={styles.icobtn}
          aria-label="Acciones"
          onClick={() => setMenuFor(open ? null : u.id)}
        >
          <Dots />
        </button>
        {open && (
          <>
            <div className={styles.backdrop} onClick={() => setMenuFor(null)} />
            <div className={styles.menu}>
              <button
                type="button"
                onClick={() => {
                  setMenuFor(null);
                  setEditarErrorMsg(null);
                  setEditando(u);
                }}
              >
                Editar
              </button>
              <button
                type="button"
                className={u.activo ? styles.danger : undefined}
                disabled={pending}
                onClick={() => {
                  setMenuFor(null);
                  onToggle(u.id);
                }}
              >
                {u.activo ? "Desactivar" : "Activar"}
              </button>
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input placeholder="Buscar usuario…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        </div>
        <select
          className={styles.fsel}
          value={fEstado}
          onChange={(e) => setFEstado(e.target.value as typeof fEstado)}
          aria-label="Filtrar por estado"
        >
          <option value="todos">Todos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
        <span className={styles.spacer} />
        <div className={styles.seg}>
          <button type="button" className={vista === "cards" ? styles.on : ""} onClick={() => setVista("cards")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            Tarjetas
          </button>
          <button type="button" className={vista === "tabla" ? styles.on : ""} onClick={() => setVista("tabla")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Tabla
          </button>
        </div>
        <Button variant="primary" onClick={() => { setCrearError(null); setCreando(true); }}>
          + Nuevo usuario
        </Button>
      </div>

      {lista.length === 0 ? (
        <Card>
          <p className={styles.empty}>
            {q ? "Ningún usuario coincide con la búsqueda." : "Aún no hay usuarios registrados."}
          </p>
        </Card>
      ) : vista === "cards" ? (
        <div className={styles.grid}>
          {lista.map((u) => {
            const todasLasSedes = sedes.length > 0 && u.sedeIds.length === sedes.length;
            return (
              <Card key={u.id} className={styles.itemCard}>
                <div className={styles.top}>
                  <div className={styles.title}>{u.usuario}</div>
                  <Badge tone={u.activo ? "success" : "neutral"}>{u.activo ? "Activo" : "Inactivo"}</Badge>
                </div>
                <div className={styles.meta}>
                  {u.puedeAdmin && <Badge tone="brand">Admin</Badge>}
                  {u.puedeTaquilla && <Badge tone="info">Taquilla</Badge>}
                </div>
                <div className={styles.chips}>
                  {u.puedeTaquilla ? (
                    todasLasSedes ? (
                      <span className={`${styles.chip} ${styles.chipN}`}>Todos los complejos</span>
                    ) : u.sedes.length > 0 ? (
                      u.sedes.map((s) => (
                        <span key={s} className={styles.chip}>{s}</span>
                      ))
                    ) : (
                      <span className={`${styles.chip} ${styles.chipN}`}>Sin sucursales</span>
                    )
                  ) : (
                    <span className={`${styles.chip} ${styles.chipN}`}>—</span>
                  )}
                </div>
                <div className={styles.acts}>
                  <span className={styles.actSpacer} />
                  {menuNode(u)}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className={`card ${styles.list}`}>
          <div className={`${styles.trow} ${styles.thead}`} style={{ gridTemplateColumns: "1.6fr 1.4fr 0.9fr 48px" }}>
            <span>Usuario</span>
            <span className={styles.tHideSm}>Accesos</span>
            <span>Estado</span>
            <span />
          </div>
          {lista.map((u) => (
            <div
              className={`${styles.trow} ${styles.trowBody}`}
              key={u.id}
              style={{ gridTemplateColumns: "1.6fr 1.4fr 0.9fr 48px" }}
            >
              <div className={styles.lname}>
                <b>{u.usuario}</b>
              </div>
              <div className={styles.tHideSm}>
                <div className="flex gap-1.5">
                  {u.puedeAdmin && <Badge tone="brand">Admin</Badge>}
                  {u.puedeTaquilla && <Badge tone="info">Taquilla</Badge>}
                </div>
              </div>
              <div>
                <Badge tone={u.activo ? "success" : "neutral"}>{u.activo ? "Activo" : "Inactivo"}</Badge>
              </div>
              <div className={styles.center}>{menuNode(u)}</div>
            </div>
          ))}
        </div>
      )}

      <Modal open={creando} onClose={() => setCreando(false)} title="Nuevo usuario">
        <form key={crearKey} action={onCrear} className="space-y-3">
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
            <p className="text-sm text-[var(--error-150)]">{crearError}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreando(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Creando…" : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>

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
