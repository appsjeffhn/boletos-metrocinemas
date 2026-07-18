import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function EventosPage() {
  const items = [
    { href: "/eventos/lotes", title: "Lotes", desc: "Generar lotes de boletos, definir sus productos, imprimir/QR." },
    { href: "/eventos/productos", title: "Productos", desc: "Catálogo de productos reutilizables (entradas, combos, etc.)." },
    { href: "/eventos/empresas", title: "Empresas", desc: "Clientes que reciben los boletos de cortesía." },
  ];
  return (
    <section className="space-y-6">
      <h1 className="text-[28px] leading-8">Eventos</h1>
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
