"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";

export default function Scanner() {
  const router = useRouter();
  const handledRef = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode("reader");
    let stopped = false;

    // Detiene la cámara una sola vez, de forma segura (stop() puede lanzar si
    // ya está detenida o en transición).
    const stop = async () => {
      if (stopped) return;
      stopped = true;
      try { await scanner.stop(); } catch {}
      try { scanner.clear(); } catch {}
    };

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      async (texto) => {
        // html5-qrcode invoca este callback continuamente (~10 fps) mientras el QR
        // está a la vista. Procesamos SOLO el primer escaneo válido: sin esta
        // guardia se disparan múltiples router.push y la navegación se rompe
        // ("This page couldn't load").
        if (handledRef.current) return;
        const token = texto.split("/canje/")[1]?.split(/[/?#]/)[0];
        if (!token) return;
        handledRef.current = true;
        await stop();                       // liberar la cámara ANTES de navegar
        router.push(`/canje/${token}`);
      },
      () => {},
    ).catch(() => {});

    return () => { void stop(); };
  }, [router]);

  return <div id="reader" className="w-full max-w-sm mx-auto" />;
}
