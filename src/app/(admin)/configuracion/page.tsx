import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function ConfiguracionPage() {
  const items = [
    { href: "/configuracion/usuarios", title: "Usuarios", desc: "Crear, editar y activar/desactivar usuarios y sus accesos." },
    { href: "/configuracion/sedes", title: "Sedes", desc: "Administrar sedes/sucursales: crear, editar y activar/desactivar." },
    { href: "/configuracion/zona-horaria", title: "Zona horaria", desc: "Ajustar la zona horaria de la aplicación." },
  ];
  return (
    <section className="space-y-6">
      <h1 className="text-[28px] leading-8">Configuración</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className="block">
            <Card className="h-full hover:border-[var(--blue-hover)] transition-colors">
              <h2 className="text-base font-semibold">{it.title}</h2>
              <p className="text-sm text-[var(--black-60)] mt-1">{it.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
