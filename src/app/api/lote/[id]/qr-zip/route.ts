import QRCode from "qrcode";
import JSZip from "jszip";
import { db } from "@/db/client";
import { boletosDeLote } from "@/domain/boletosQuery";
import { getCurrentUser } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await getCurrentUser();
  if (!u || !u.puedeAdmin) {
    return new Response("No autorizado", { status: 403 });
  }

  const { id } = await params;
  const loteId = Number(id);
  if (!Number.isInteger(loteId) || loteId < 1) {
    return new Response("Lote inválido", { status: 400 });
  }

  const filas = await boletosDeLote(db, loteId);

  const zip = new JSZip();
  for (const b of filas) {
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/canje/${b.token}`;
    const png = await QRCode.toBuffer(url, { width: 320, margin: 1 });
    zip.file(`${b.codigo}.png`, png);
  }

  const contenido = await zip.generateAsync({ type: "uint8array" });

  return new Response(new Uint8Array(contenido), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="lote-${loteId}-qr.zip"`,
    },
  });
}
