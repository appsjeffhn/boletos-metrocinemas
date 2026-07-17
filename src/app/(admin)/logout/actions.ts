"use server";
import { redirect } from "next/navigation";
import { clearSessionCookie } from "@/lib/session";

// Logout como server action (POST): un GET prefetcheable borraría la sesión sola.
export async function cerrarSesion() {
  await clearSessionCookie();
  redirect("/login");
}
