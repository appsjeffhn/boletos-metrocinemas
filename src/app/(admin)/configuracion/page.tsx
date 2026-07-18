import { LandingCards, type LandingItem } from "@/components/LandingCards";

const items: LandingItem[] = [
  { href: "/configuracion/usuarios", title: "Usuarios", desc: "Crear, editar y activar/desactivar usuarios y sus accesos.", icon: "usuarios" },
  { href: "/configuracion/sedes", title: "Sedes", desc: "Administrar sedes/sucursales: crear, editar y activar/desactivar.", icon: "sedes" },
  { href: "/configuracion/zona-horaria", title: "Zona horaria", desc: "Ajustar la zona horaria de la aplicación.", icon: "zona" },
];

export default function ConfiguracionPage() {
  return (
    <section className="space-y-6">
      <h1>Configuración</h1>
      <LandingCards items={items} />
    </section>
  );
}
