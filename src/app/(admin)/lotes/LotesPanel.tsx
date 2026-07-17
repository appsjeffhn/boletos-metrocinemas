"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Th, Td } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import type { LoteListado } from "@/domain/lotesQuery";
import { anularLoteAction, crearLoteAction, type LoteActionResult } from "./actions";

type Empresa = { id: number; nombre: string };
type Sede = { id: number; nombre: string };

function SedesSelector({ sedes }: { sedes: Sede[] }) {
  const [todas, setTodas] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());

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

export function LotesPanel({
  lotes,
  empresas,
  sedes,
}: {
  lotes: LoteListado[];
  empresas: Empresa[];
  sedes: Sede[];
}) {
  const [crearError, setCrearError] = useState<string | null>(null);
  const [crearKey, setCrearKey] = useState(0);
  const [anulando, setAnulando] = useState<LoteListado | null>(null);
  const [anularError, setAnularError] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
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
                  <Link
                    className="btn btn-secondary text-xs px-3 py-1.5"
                    href={`/lotes/${l.id}/imprimir`}
                  >
                    Imprimir/PDF
                  </Link>
                  <a className="btn btn-secondary text-xs px-3 py-1.5" href={`/api/lote/${l.id}/qr-zip`}>
                    Descargar QR (ZIP)
                  </a>
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
    </>
  );
}
