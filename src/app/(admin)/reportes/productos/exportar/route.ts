import { db } from "@/db/client";
import { detalleCanjesProductos } from "@/domain/reportesProductos";
import { aCsvCanjesProductos } from "@/domain/exportarProductos";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const num = (k: string) => (url.searchParams.get(k) ? Number(url.searchParams.get(k)) : undefined);
  const str = (k: string) => url.searchParams.get(k) ?? undefined;
  const filas = await detalleCanjesProductos(db, {
    empresaId: num("empresaId"), sedeId: num("sedeId"), desde: str("desde"), hasta: str("hasta"),
  });
  const csv = "﻿" + aCsvCanjesProductos(filas); // BOM para que Excel abra en UTF-8
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="items.csv"`,
    },
  });
}
