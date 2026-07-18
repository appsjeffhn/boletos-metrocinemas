import { LandingCards, type LandingItem } from "@/components/LandingCards";

const items: LandingItem[] = [
  { href: "/eventos/lotes", title: "Lotes", desc: "Generar lotes de boletos, definir sus productos e imprimir/QR.", icon: "lotes" },
  { href: "/eventos/productos", title: "Productos", desc: "Catálogo de productos reutilizables (entradas, combos, etc.).", icon: "productos" },
  { href: "/eventos/empresas", title: "Empresas", desc: "Clientes que reciben los boletos de cortesía.", icon: "empresas" },
];

export default function EventosPage() {
  return (
    <section className="space-y-6">
      <h1>Eventos</h1>
      <LandingCards items={items} />
    </section>
  );
}
