"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/eventos", label: "Eventos" },
  { href: "/reportes", label: "Reportes" },
  { href: "/configuracion", label: "Configuración" },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

export function AppNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "";

  return (
    <div className="flex-1 min-w-0">
      {/* Desktop / tablet nav — tabs tipo pill con estado activo */}
      <nav className="hidden md:flex flex-wrap items-center gap-1.5 text-sm">
        {NAV.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={
                "px-3.5 py-1.5 rounded-full transition-colors " +
                (active
                  ? "bg-white text-[var(--coral-100)] font-semibold shadow-sm"
                  : "text-white/80 hover:text-white hover:bg-white/10")
              }
            >
              {n.label}
            </Link>
          );
        })}
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
          {NAV.map((n) => {
            const active = isActive(pathname, n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={
                  "px-4 py-3.5 border-t border-white/10 transition-colors " +
                  (active
                    ? "text-[var(--blue-100)] font-semibold bg-white/5 border-l-2 border-l-[var(--blue-100)]"
                    : "text-white/85 hover:text-[var(--blue-100)] hover:bg-white/5")
                }
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
