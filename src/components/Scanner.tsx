"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";

export default function Scanner() {
  const router = useRouter();
  const ref = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode("reader");
    ref.current = scanner;
    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      (texto) => {
        // El QR contiene la URL .../canje/<token>; extraemos el token.
        const token = texto.split("/canje/")[1]?.split(/[/?#]/)[0];
        if (token) { scanner.stop().catch(() => {}); router.push(`/canje/${token}`); }
      },
      () => {},
    ).catch(() => {});
    return () => { scanner.stop().catch(() => {}); };
  }, [router]);

  return <div id="reader" className="w-full max-w-sm mx-auto" />;
}
