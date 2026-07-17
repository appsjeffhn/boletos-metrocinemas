import Link from "next/link";
import Image from "next/image";
import { cerrarSesion } from "@/app/(admin)/logout/actions";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/reportes", label: "Reportes" },
  { href: "/empresas", label: "Empresas" },
  { href: "/lotes", label: "Lotes" },
  { href: "/usuarios", label: "Usuarios" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header style={{ background: "var(--coral-100)" }} className="text-white">
        <div className="max-w-6xl mx-auto flex items-center gap-6 px-4 h-16">
          <Link href="/dashboard" className="shrink-0">
            <Image src="/logo.png" alt="Metrocinemas" width={132} height={36} priority style={{ height: 32, width: "auto" }} />
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm flex-1">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-white/85 hover:text-[var(--blue-100)] transition-colors">
                {n.label}
              </Link>
            ))}
          </nav>
          <form action={cerrarSesion}>
            <button className="text-sm text-white/70 hover:text-white">Cerrar sesión</button>
          </form>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}
