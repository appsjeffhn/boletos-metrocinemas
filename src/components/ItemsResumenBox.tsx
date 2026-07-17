import { Card } from "@/components/ui/Card";
import type { ResumenProducto } from "@/domain/reportesProductos";

function money(n: number): string {
  return `L.${n.toFixed(2)}`;
}

/**
 * Recuadro de items otorgados y sus valores (creado/canjeado/pendiente).
 * `detalle` agrega el desglose por producto además de los totales.
 * Los montos usan el precio guardado por lote; no muestra datos de taquilla.
 */
export function ItemsResumenBox({
  resumen,
  detalle = false,
}: {
  resumen: ResumenProducto[];
  detalle?: boolean;
}) {
  const totOtorgados = resumen.reduce((s, r) => s + r.creados, 0);
  const valCreado = resumen.reduce((s, r) => s + r.montoCreado, 0);
  const valCanjeado = resumen.reduce((s, r) => s + r.montoCanjeado, 0);
  const valPendiente = resumen.reduce((s, r) => s + r.montoPendiente, 0);

  return (
    <Card className="space-y-3">
      <h2 className="text-base font-semibold">Items otorgados</h2>

      {resumen.length === 0 ? (
        <p className="text-sm text-[var(--black-60)]">Sin items registrados.</p>
      ) : (
        <>
          {detalle && (
            <ul className="text-sm space-y-1">
              {resumen.map((r) => (
                <li
                  key={`${r.productoId ?? "adhoc"}-${r.nombre}`}
                  className="flex justify-between gap-4"
                >
                  <span>
                    {r.nombre}{" "}
                    <span className="text-[var(--black-60)]">· {r.creados} otorgados</span>
                  </span>
                  <span className="font-semibold">{money(r.montoCreado)}</span>
                </li>
              ))}
            </ul>
          )}

          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t"
            style={{ borderColor: "var(--black-10)" }}
          >
            <div>
              <p className="text-xs text-[var(--black-60)]">Items otorgados</p>
              <p className="text-lg font-semibold">{totOtorgados}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--black-60)]">Valor otorgado</p>
              <p className="text-lg font-semibold">{money(valCreado)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--black-60)]">Valor canjeado</p>
              <p className="text-lg font-semibold" style={{ color: "var(--success-150)" }}>
                {money(valCanjeado)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--black-60)]">Valor pendiente</p>
              <p className="text-lg font-semibold" style={{ color: "var(--warning-150)" }}>
                {money(valPendiente)}
              </p>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
