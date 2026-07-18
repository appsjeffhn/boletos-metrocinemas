"use client";
import { useState } from "react";
import Link from "next/link";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/reportes", label: "Reportes" },
  { href: "/empresas", label: "Empresas" },
  { href: "/lotes", label: "Lotes" },
  { href: "/productos", label: "Productos" },
  { href: "/configuracion", label: "Configuración" },
];

export function AppNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex-1 min-w-0">
      {/* Desktop / tablet nav */}
      <nav className="hidden md:flex flex-wrap gap-4 text-sm">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="text-white/85 hover:text-[var(--blue-100)] transition-colors"
          >
            {n.label}
          </Link>
        ))}
      </nav>

      {/* Mobile hamburger toggle */}
      <button
        type="button"
        className="md:hidden flex items-center justify-center w-11 h-11 -ml-2 text-white/85 hover:text-white"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {/* Mobile dropdown panel */}
      {open && (
        <nav
          className="md:hidden absolute left-0 right-0 top-16 z-40 flex flex-col text-sm shadow-lg"
          style={{ background: "var(--coral-100)" }}
        >
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className="px-4 py-3.5 border-t border-white/10 text-white/85 hover:text-[var(--blue-100)] hover:bg-white/5 transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
