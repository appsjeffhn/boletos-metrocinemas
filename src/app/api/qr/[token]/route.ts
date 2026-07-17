import QRCode from "qrcode";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/canje/${token}`;
  const png = await QRCode.toBuffer(url, { width: 320, margin: 1 });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
