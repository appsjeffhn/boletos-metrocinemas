"use client";
import { useEffect } from "react";

/** Registers the PWA service worker. Guarded to production + secure contexts
 * so local `next dev` (with its own HMR/webpack quirks) never registers a
 * stale worker. */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (!window.isSecureContext) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability is a progressive enhancement; ignore failures.
    });
  }, []);

  return null;
}
