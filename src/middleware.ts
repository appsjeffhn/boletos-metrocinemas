import { NextRequest, NextResponse } from "next/server";
import { verifySession, type SessionPayload } from "@/lib/auth";
import { COOKIE_NAME } from "@/lib/session";

const ADMIN_PREFIXES = ["/dashboard", "/reportes", "/empresas", "/lotes", "/configuracion"];
const TAQUILLA_PREFIXES = ["/taquilla", "/canje"];

function destinoDisponible(sesion: SessionPayload | null): string {
  if (sesion?.puedeAdmin) return "/dashboard";
  if (sesion?.puedeTaquilla) return "/taquilla";
  return "/login";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const sesion = token ? await verifySession(token) : null;

  const esAdmin = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));
  const esTaquilla = TAQUILLA_PREFIXES.some((p) => pathname.startsWith(p));
  const esElegirSede = pathname.startsWith("/elegir-sede");

  if ((esAdmin || esTaquilla || esElegirSede) && !sesion) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (esAdmin && !sesion?.puedeAdmin) {
    return NextResponse.redirect(new URL(destinoDisponible(sesion), req.url));
  }
  if (esTaquilla && !sesion?.puedeTaquilla) {
    return NextResponse.redirect(new URL(destinoDisponible(sesion), req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/empresas/:path*",
    "/lotes/:path*",
    "/reportes/:path*",
    "/configuracion/:path*",
    "/taquilla/:path*",
    "/canje/:path*",
    "/elegir-sede/:path*",
  ],
};
