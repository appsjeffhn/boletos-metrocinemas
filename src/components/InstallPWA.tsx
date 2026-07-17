"use client";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa-install-dismiss";

export function InstallPWA() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    // Ya instalada (modo app) → no mostrar
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    // Descartada por el usuario recientemente
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    // Solo en teléfonos
    const ua = navigator.userAgent;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
    if (!isMobile) return;

    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    if (isIOS) {
      setIos(true);
      setShow(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  };

  return (
    <div
      className="fixed bottom-3 inset-x-3 z-50 card p-3 flex items-center gap-3"
      style={{ boxShadow: "var(--shadow-12)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" width={40} height={40} style={{ borderRadius: 10 }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">Instalar Boletos Metrocinemas</p>
        <p className="text-xs" style={{ color: "var(--black-60)" }}>
          {ios
            ? "Toca Compartir y luego “Agregar a inicio”."
            : "Acceso directo desde tu pantalla de inicio."}
        </p>
      </div>
      {!ios && (
        <button onClick={install} className="btn btn-primary shrink-0" style={{ padding: "8px 16px" }}>
          Instalar
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label="Cerrar"
        className="shrink-0 px-1 text-xl leading-none"
        style={{ color: "var(--black-40)" }}
      >
        ×
      </button>
    </div>
  );
}
