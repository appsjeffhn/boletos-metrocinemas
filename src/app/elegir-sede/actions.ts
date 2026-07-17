"use server";
import { redirect } from "next/navigation";
import { signSession } from "@/lib/auth";
import { getCurrentUser, setSessionCookie } from "@/lib/session";

export async function elegirSede(formData: FormData) {
  const u = await getCurrentUser();
  if (!u || !u.puedeTaquilla) redirect("/login");

  const sedeId = Number(formData.get("sedeId"));
  if (!u.sedeIds.includes(sedeId)) redirect("/elegir-sede");

  const token = await signSession({ ...u, activeSedeId: sedeId });
  await setSessionCookie(token);
  redirect("/taquilla");
}
