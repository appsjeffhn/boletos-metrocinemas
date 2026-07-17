import Link from "next/link";
import Image from "next/image";
import { cerrarSesion } from "@/app/(admin)/logout/actions";
import { AppNav } from "@/components/AppNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header style={{ background: "var(--coral-100)" }} className="relative text-white">
        <div className="max-w-6xl mx-auto flex items-center gap-3 sm:gap-6 px-4 h-16">
          <Link href="/dashboard" className="shrink-0">
            <Image src="/logo.png" alt="Metrocinemas" width={132} height={36} priority style={{ height: 32, width: "auto" }} />
          </Link>
          <AppNav />
          <form action={cerrarSesion} className="shrink-0">
            <button className="text-sm text-white/70 hover:text-white px-2 py-2 -mr-2">Cerrar sesión</button>
          </form>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}
