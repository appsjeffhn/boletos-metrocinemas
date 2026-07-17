import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await getCurrentUser();
  if (!u || u.rol !== "admin") redirect("/login");
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <nav className="flex gap-4 p-4 border-b border-neutral-800 text-sm">
        <Link href="/reportes">Reportes</Link>
        <Link href="/empresas">Empresas</Link>
        <Link href="/lotes">Lotes</Link>
        <Link href="/usuarios">Usuarios</Link>
      </nav>
      <main className="p-4 max-w-5xl mx-auto">{children}</main>
    </div>
  );
}
