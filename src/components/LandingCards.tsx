import Link from "next/link";
import type { ReactNode } from "react";
import s from "./LandingCards.module.css";

const I = { w: 24, h: 24, viewBox: "0 0 24 24", fill: "none" } as const;
const stroke = { stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const ICONS: Record<string, ReactNode> = {
  lotes: (
    <svg {...I}><path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V7Z" {...stroke} /><path d="M12 5v14" strokeDasharray="2 2.5" {...stroke} /></svg>
  ),
  productos: (
    <svg {...I}><path d="m3 8 9-4 9 4-9 4-9-4Z" {...stroke} /><path d="M3 8v8l9 4 9-4V8" {...stroke} /><path d="M12 12v8" {...stroke} /></svg>
  ),
  empresas: (
    <svg {...I}><path d="M3 21h18M5 21V6l7-3v18M19 21V10l-7-3" {...stroke} /><path d="M8.5 9v0M8.5 12v0M8.5 15v0" {...stroke} /></svg>
  ),
  reportEmpresas: (
    <svg {...I}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" {...stroke} /></svg>
  ),
  reportItems: (
    <svg {...I}><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 3 12V4a1 1 0 0 1 1-1h8a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.6Z" {...stroke} /><path d="M7.5 7.5v0" {...stroke} /></svg>
  ),
  usuarios: (
    <svg {...I}><circle cx="9" cy="8" r="3.2" {...stroke} /><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.6M17 14.5a5.5 5.5 0 0 1 3.5 5.5" {...stroke} /></svg>
  ),
  sedes: (
    <svg {...I}><path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" {...stroke} /><circle cx="12" cy="10" r="2.5" {...stroke} /></svg>
  ),
  zona: (
    <svg {...I}><circle cx="12" cy="12" r="8.5" {...stroke} /><path d="M12 7v5l3 2" {...stroke} /></svg>
  ),
};

export type LandingItem = { href: string; title: string; desc: string; icon: keyof typeof ICONS };

export function LandingCards({ items }: { items: LandingItem[] }) {
  return (
    <div className={s.grid}>
      {items.map((it) => (
        <Link key={it.href} href={it.href} className={s.tile}>
          <span className={s.badge}>{ICONS[it.icon]}</span>
          <span className={s.title}>{it.title}</span>
          <p className={s.desc}>{it.desc}</p>
          <span className={s.go}>
            Abrir
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" {...stroke} /></svg>
          </span>
        </Link>
      ))}
    </div>
  );
}
