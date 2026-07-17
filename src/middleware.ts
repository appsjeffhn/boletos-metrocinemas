import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { COOKIE_NAME } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const sesion = token ? await verifySession(token) : null;

  const esAdmin = pathname.startsWith("/empresas") || pathname.startsWith("/lotes")
    || pathname.startsWith("/reportes") || pathname.startsWith("/usuarios");
  const esTaquilla = pathname.startsWith("/taquilla") || pathname.startsWith("/canje");

  if ((esAdmin || esTaquilla) && !sesion) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (esAdmin && sesion?.rol !== "admin") {
    return NextResponse.redirect(new URL("/taquilla", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/empresas/:path*", "/lotes/:path*", "/reportes/:path*", "/usuarios/:path*", "/taquilla/:path*", "/canje/:path*"],
};
