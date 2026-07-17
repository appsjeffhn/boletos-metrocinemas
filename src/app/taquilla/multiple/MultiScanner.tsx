"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { confirmarCanjeMultiple, type CanjeMultipleState } from "./actions";

const RAZONES: Record<string, string> = {
  invalido: "Boleto inválido o falso",
  canjeado: "Ya fue canjeado",
  anulado: "Anulado",
  vencido: "Vencido",
  sede_no_valida: "No válido en esta sede",
};

// Tiempo durante el cual un token recién quitado de la lista no se vuelve a
// agregar automáticamente (por si el QR sigue frente a la cámara).
const COOLDOWN_MS = 2000;

type Item = { token: string };

export default function MultiScanner() {
  const [items, setItems] = useState<Item[]>([]);
  const [flash, setFlash] = useState(false);
  const [portadorNombre, setPortadorNombre] = useState("");
  const [portadorDni, setPortadorDni] = useState("");
  const [phase, setPhase] = useState<"scanning" | "results">("scanning");
  const [result, setResult] = useState<CanjeMultipleState | null>(null);
  const [pending, startTransition] = useTransition();

  // Espejo síncrono de `items`: el callback del scanner se registra una sola
  // vez por sesión de cámara y necesita ver el estado más reciente sin
  // depender de un closure obsoleto.
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
        // A diferencia del escaneo sencillo, aquí NO detenemos la cámara tras
        // el primer escaneo: el operador debe poder escanear varios boletos
        // en fila. Para evitar agregar el mismo QR una y otra vez mientras
        // sigue a la vista, deduplicamos por token (ya en la lista = ignorar)
        // y aplicamos un breve cooldown tras quitarlo manualmente.
        const token = texto.split("/canje/")[1]?.split(/[/?#]/)[0];
        if (!token) return;
        if (itemsRef.current.some((it) => it.token === token)) return;
        const ultimaVezQuitado = cooldownRef.current.get(token);
        if (ultimaVezQuitado && Date.now() - ultimaVezQuitado < COOLDOWN_MS) return;

        const nuevos = [...itemsRef.current, { token }];
        itemsRef.current = nuevos;
        setItems(nuevos);
        setFlash(true);
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = setTimeout(() => setFlash(false), 1200);
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

  function confirmar() {
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
    setPortadorNombre("");
    setPortadorDni("");
    setPhase("scanning");
  }

  if (phase === "results" && result?.resultados) {
    return (
      <div className="space-y-4">
        <Card className="text-center space-y-1">
          <p className="text-lg font-semibold">
            {result.exitosos} canjeado{result.exitosos === 1 ? "" : "s"}, {result.fallidos} fallido{result.fallidos === 1 ? "" : "s"}
          </p>
        </Card>

        <Card className="space-y-2">
          {result.resultados.map((r) => (
            <div
              key={r.token}
              className="flex items-center justify-between gap-2 text-sm border-b py-1 last:border-b-0"
              style={{ borderColor: "var(--black-10)" }}
            >
              <span className="font-mono truncate">{r.codigo ?? `${r.token.slice(0, 10)}…`}</span>
              {r.ok ? (
                <span className="shrink-0" style={{ color: "var(--success-150)" }}>✓ Canjeado</span>
              ) : (
                <span className="shrink-0" style={{ color: "var(--error-150)" }}>
                  ✗ {(r.razon && RAZONES[r.razon]) ?? "Error"}
                </span>
              )}
            </div>
          ))}
        </Card>

        <Button type="button" onClick={reiniciar} className="w-full">
          Escanear otro grupo
        </Button>
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
          <p className="text-center text-sm mt-2 font-semibold" style={{ color: "var(--success-150)" }}>
            ✓ Agregado
          </p>
        )}
      </Card>

      <Card>
        <p className="text-sm font-semibold mb-2">
          {items.length} boleto{items.length === 1 ? "" : "s"} escaneado{items.length === 1 ? "" : "s"}
        </p>
        {items.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--black-60)" }}>Aún no has escaneado ningún boleto.</p>
        ) : (
          <ul className="space-y-1">
            {items.map((it) => (
              <li key={it.token} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-mono truncate">{it.token.slice(0, 14)}…</span>
                <button
                  type="button"
                  onClick={() => quitar(it.token)}
                  className="text-xs underline shrink-0"
                  style={{ color: "var(--error-150)" }}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-4">
        <Input
          label="Nombre del portador"
          value={portadorNombre}
          onChange={(e) => setPortadorNombre(e.target.value)}
          required
        />
        <Input
          label="DNI del portador"
          value={portadorDni}
          onChange={(e) => setPortadorDni(e.target.value)}
          required
        />
        {result?.error && <p className="text-sm" style={{ color: "var(--error-150)" }}>{result.error}</p>}
        <Button
          type="button"
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
