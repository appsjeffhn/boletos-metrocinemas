import type { CanjeProductoRow } from "@/domain/reportesProductos";
import { esc } from "@/domain/exportar";

export function aCsvCanjesProductos(filas: CanjeProductoRow[]): string {
  const cols = ["producto", "empresa", "sede", "loteId", "codigo", "cantidad", "precioUnitario", "importe", "operador", "fecha"];
  const head = cols.join(",");
  const body = filas.map((f) => [
    f.producto, f.empresa, f.sede ?? "", String(f.loteId), f.codigo, String(f.cantidad),
    f.precioUnitario == null ? "" : String(f.precioUnitario),
    f.importe == null ? "" : String(f.importe),
    f.operador ?? "", f.fecha ? f.fecha.toISOString() : "",
  ].map((x) => esc(String(x))).join(",")).join("\n");
  return `${head}\n${body}\n`;
}
