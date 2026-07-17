import { db } from "@/db/client";
import { listarCanjes } from "@/domain/reportes";
import { aCsv } from "@/domain/exportar";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const num = (k: string) => (url.searchParams.get(k) ? Number(url.searchParams.get(k)) : undefined);
  const str = (k: string) => url.searchParams.get(k) ?? undefined;
  const filas = await listarCanjes(db, {
    empresaId: num("empresaId"), sedeId: num("sedeId"), desde: str("desde"), hasta: str("hasta"),
  });
  const csv = "﻿" + aCsv(filas); // BOM para que Excel abra en UTF-8
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="canjes.csv"`,
    },
  });
}
