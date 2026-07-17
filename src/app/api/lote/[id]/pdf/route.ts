import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { db } from "@/db/client";
import { boletosDeLote } from "@/domain/boletosQuery";
import { getCurrentUser } from "@/lib/session";

// Página carta (Letter) en puntos, con márgenes y grilla fijos para
// que la impresión sea siempre consistente (sin encabezados de navegador).
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 36;
const COLS = 3;
const ROWS = 4;
const PER_PAGE = COLS * ROWS;
const CELL_W = (PAGE_W - 2 * MARGIN) / COLS;
const CELL_H = (PAGE_H - 2 * MARGIN) / ROWS;
const QR_SIZE = 120;

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

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let indexInPage = 0;

  for (const b of filas) {
    if (indexInPage === PER_PAGE) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      indexInPage = 0;
    }

    const col = indexInPage % COLS;
    const row = Math.floor(indexInPage / COLS);
    const cellX = MARGIN + col * CELL_W;
    const cellTopY = PAGE_H - MARGIN - row * CELL_H;

    const url = `${process.env.NEXT_PUBLIC_APP_URL}/canje/${b.token}`;
    const png = await QRCode.toBuffer(url, { width: 300, margin: 1 });
    const qrImage = await pdfDoc.embedPng(png);

    const qrX = cellX + (CELL_W - QR_SIZE) / 2;
    const qrY = cellTopY - 12 - QR_SIZE;
    page.drawImage(qrImage, { x: qrX, y: qrY, width: QR_SIZE, height: QR_SIZE });

    const codigoSize = 11;
    const codigoWidth = fontBold.widthOfTextAtSize(b.codigo, codigoSize);
    page.drawText(b.codigo, {
      x: cellX + (CELL_W - codigoWidth) / 2,
      y: qrY - 16,
      size: codigoSize,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    const caption = "Metrocinemas";
    const captionSize = 8;
    const captionWidth = font.widthOfTextAtSize(caption, captionSize);
    page.drawText(caption, {
      x: cellX + (CELL_W - captionWidth) / 2,
      y: qrY - 30,
      size: captionSize,
      font,
      color: rgb(0.45, 0.45, 0.45),
    });

    indexInPage++;
  }

  if (filas.length === 0) {
    const mensaje = "Este lote no tiene boletos.";
    const size = 12;
    const w = font.widthOfTextAtSize(mensaje, size);
    page.drawText(mensaje, {
      x: (PAGE_W - w) / 2,
      y: PAGE_H / 2,
      size,
      font,
      color: rgb(0, 0, 0),
    });
  }

  const pdfBytes = await pdfDoc.save();

  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="lote-${loteId}-boletos.pdf"`,
    },
  });
}
