import { db } from "@/db/client";
import { listarProductos } from "@/domain/productosQuery";
import { ProductosPanel } from "./ProductosPanel";

export default async function ProductosPage() {
  const productos = await listarProductos(db);
  return (
    <section className="space-y-6">
      <h1 className="text-[28px] leading-8">Productos</h1>
      <ProductosPanel productos={productos} />
    </section>
  );
}
