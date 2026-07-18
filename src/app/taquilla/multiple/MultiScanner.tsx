"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { DniInput } from "@/components/DniInput";
import { Button } from "@/components/ui/Button";
import { confirmarCanjeMultiple, infoBoleto, type CanjeMultipleState, type CanjeInfo, type InfoBoleto } from "./actions";
import { totalizarProductos } from "@/domain/totalizar";

const RAZONES: Record<string, string> = {
  invalido: "Boleto inválido o falso",
  canjeado: "Ya fue canjeado",
  anulado: "Anulado",
  vencido: "Vencido",
  sede_no_valida: "No válido en esta sede",
};

const ESTADO_LABEL: Record<string, string> = {
  buscando: "Buscando…",
  valido: "Válido",
  canjeado: "Ya canjeado",
  anulado: "Anulado",
  vencido: "Vencido",
  invalido: "Inválido",
};

const COOLDOWN_MS = 2000;

type Item = Omit<InfoBoleto, "estado"> & { estado: InfoBoleto["estado"] | "buscando" };

function fmtFecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-HN");
}

function DetalleCanje({ canje }: { canje: CanjeInfo }) {
  return (
    <div className="mt-1 text-xs rounded-lg p-2" style={{ background: "var(--black-10)", color: "var(--black-60)" }}>
      <p><span className="font-semibold">Sede:</span> {canje.sede ?? "—"}</p>
      <p><span className="font-semibold">Usuario:</span> {canje.operador ?? "—"}</p>
      <p><span className="font-semibold">Persona:</span> {canje.portadorNombre ?? "—"}</p>
      <p><span className="font-semibold">DNI:</span> {canje.portadorDni ?? "—"}</p>
      <p><span className="font-semibold">Fecha:</span> {fmtFecha(canje.fecha)}</p>
    </div>
  );
}

export default function MultiScanner() {
  const [items, setItems] = useState<Item[]>([]);
  const [flash, setFlash] = useState(false);
  const [portadorNombre, setPortadorNombre] = useState("");
  const [portadorDni, setPortadorDni] = useState("");
  const [phase, setPhase] = useState<"scanning" | "results">("scanning");
  const [result, setResult] = useState<CanjeMultipleState | null>(null);
  const [expandido, setExpandido] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;
  const cooldownRef = useRef<Map<string, number>>(new Map());
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (phase !== "scanning") return;

    const scanner = new Html5Qrcode("reader-multi");
    let stopped = false;
    const stop = async () => {
      if (stopped) return;
      stopped = true;
      try { await scanner.stop(); } catch {}
      try { scanner.clear(); } catch {}
    };

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      (texto) => {
        const token = texto.split("/canje/")[1]?.split(/[/?#]/)[0];
        if (!token) return;
        if (itemsRef.current.some((it) => it.token === token)) return;
        const ultimaVezQuitado = cooldownRef.current.get(token);
        if (ultimaVezQuitado && Date.now() - ultimaVezQuitado < COOLDOWN_MS) return;

        const placeholder: Item = { token, codigo: null, estado: "buscando", productos: [] };
        const nuevos = [...itemsRef.current, placeholder];
        itemsRef.current = nuevos;
        setItems(nuevos);
        setFlash(true);
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = setTimeout(() => setFlash(false), 1200);

        // Consultar código + estado + datos de canje.
        infoBoleto(token)
          .then((info) => {
            setItems((prev) => prev.map((it) => (it.token === token ? { ...info, estado: info.estado } : it)));
          })
          .catch(() => {});
      },
      () => {},
    ).catch(() => {});

    return () => { void stop(); };
  }, [phase]);

  useEffect(() => () => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
  }, []);

  function quitar(token: string) {
    cooldownRef.current.set(token, Date.now());
    setItems((prev) => prev.filter((it) => it.token !== token));
  }

  function toggle(token: string) {
    setExpandido((prev) => {
      const n = new Set(prev);
      if (n.has(token)) n.delete(token); else n.add(token);
      return n;
    });
  }

  function confirmar() {
    // Solo intentamos canjear los que están válidos; los ya canjeados/inválidos
    // se muestran igual en los resultados con sus datos.
    const tokens = items.map((it) => it.token);
    startTransition(async () => {
      const r = await confirmarCanjeMultiple(tokens, portadorNombre, portadorDni);
      setResult(r);
      if (!r.error && r.resultados) setPhase("results");
    });
  }

  function reiniciar() {
    itemsRef.current = [];
    cooldownRef.current = new Map();
    setItems([]);
    setResult(null);
    setExpandido(new Set());
    setPortadorNombre("");
    setPortadorDni("");
    setPhase("scanning");
  }

  const itemPorToken = (token: string) => items.find((it) => it.token === token);
  const totalizado = totalizarProductos(items.filter((it) => it.estado === "valido"));

  if (phase === "results" && result?.resultados) {
    return (
      <div className="space-y-4">
        <Card className="text-center space-y-1">
          <p className="text-lg font-semibold">
            {result.exitosos} canjeado{result.exitosos === 1 ? "" : "s"}, {result.fallidos} fallido{result.fallidos === 1 ? "" : "s"}
          </p>
        </Card>

        <Card className="space-y-2">
          {result.resultados.map((r) => {
            const it = itemPorToken(r.token);
            const codigo = r.codigo ?? it?.codigo ?? "—";
            const yaCanjeado = !r.ok && r.razon === "canjeado";
            return (
              <div key={r.token} className="border-b py-1 last:border-b-0" style={{ borderColor: "var(--black-10)" }}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-mono truncate">{codigo}</span>
                  {r.ok ? (
                    <span className="shrink-0" style={{ color: "var(--success-150)" }}>✓ Canjeado</span>
                  ) : (
                    <span className="shrink-0 flex items-center gap-2">
                      <span style={{ color: "var(--error-150)" }}>✗ {(r.razon && RAZONES[r.razon]) ?? "Error"}</span>
                      {yaCanjeado && it?.canje && (
                        <button type="button" onClick={() => toggle(r.token)} className="text-xs underline" style={{ color: "var(--blue-hover)" }}>
                          {expandido.has(r.token) ? "Ocultar" : "Ver datos"}
                        </button>
                      )}
                    </span>
                  )}
                </div>
                {yaCanjeado && it?.canje && expandido.has(r.token) && <DetalleCanje canje={it.canje} />}
              </div>
            );
          })}
        </Card>

        <Button type="button" size="lg" onClick={reiniciar} className="w-full">Escanear otro grupo</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-base font-semibold text-center mb-4">Escaneo múltiple</h1>
        <div id="reader-multi" className="w-full max-w-sm mx-auto" />
        <p className="text-center text-sm mt-4" style={{ color: "var(--black-60)" }}>
          Escanea varios códigos QR en fila; se agregan a la lista automáticamente.
        </p>
        {flash && (
          <p className="text-center text-sm mt-2 font-semibold" style={{ color: "var(--success-150)" }}>✓ Agregado</p>
        )}
      </Card>

      <Card>
        <p className="text-sm font-semibold mb-2">
          {items.length} boleto{items.length === 1 ? "" : "s"} escaneado{items.length === 1 ? "" : "s"}
        </p>
        {items.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--black-60)" }}>Aún no has escaneado ningún boleto.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => {
              const yaCanjeado = it.estado === "canjeado";
              const tono =
                it.estado === "valido" ? "var(--success-150)"
                : it.estado === "buscando" ? "var(--black-40)"
                : "var(--error-150)";
              return (
                <li key={it.token} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono truncate">{it.codigo ?? (it.estado === "buscando" ? "…" : "Desconocido")}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-xs" style={{ color: tono }}>{ESTADO_LABEL[it.estado]}</span>
                      {yaCanjeado && it.canje && (
                        <button type="button" onClick={() => toggle(it.token)} className="text-xs underline" style={{ color: "var(--blue-hover)" }}>
                          {expandido.has(it.token) ? "Ocultar" : "Ver datos"}
                        </button>
                      )}
                      <button type="button" onClick={() => quitar(it.token)} className="text-xs underline" style={{ color: "var(--black-40)" }}>
                        Quitar
                      </button>
                    </span>
                  </div>
                  {yaCanjeado && it.canje && expandido.has(it.token) && <DetalleCanje canje={it.canje} />}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {totalizado.length > 0 && (
        <Card>
          <p className="text-sm font-semibold mb-2">Totalizado (boletos válidos)</p>
          <ul className="space-y-1 text-sm">
            {totalizado.map((t) => (
              <li key={t.nombre} className="flex justify-between">
                <span>{t.nombre}</span>
                <span className="font-semibold">{t.cantidad}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="space-y-4">
        <Input label="Nombre del portador" value={portadorNombre} onChange={(e) => setPortadorNombre(e.target.value)} required />
        <DniInput value={portadorDni} onChange={(e) => setPortadorDni(e.target.value)} required />
        {result?.error && <p className="text-sm" style={{ color: "var(--error-150)" }}>{result.error}</p>}
        <Button
          type="button"
          size="lg"
          onClick={confirmar}
          disabled={pending || items.length === 0 || !portadorNombre.trim() || !portadorDni.trim()}
          className="w-full"
        >
          {pending ? "Canjeando…" : `Confirmar ${items.length} canje${items.length === 1 ? "" : "s"}`}
        </Button>
      </Card>
    </div>
  );
}
