export type ProductoBoleto = { nombre: string; cantidadPorBoleto: number };

export function totalizarProductos(
  boletos: { productos: ProductoBoleto[] }[],
): { nombre: string; cantidad: number }[] {
  const acc = new Map<string, { nombre: string; cantidad: number }>();
  for (const b of boletos) {
    for (const p of b.productos) {
      const clave = p.nombre.trim().toLowerCase();
      const prev = acc.get(clave);
      if (prev) prev.cantidad += p.cantidadPorBoleto;
      else acc.set(clave, { nombre: p.nombre.trim(), cantidad: p.cantidadPorBoleto });
    }
  }
  return Array.from(acc.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
}
