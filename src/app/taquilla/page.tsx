import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import Scanner from "@/components/Scanner";

export default async function TaquillaPage() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return (
    <main className="min-h-screen bg-neutral-950 text-white p-4 space-y-4">
      <h1 className="text-lg font-bold text-center">Escanear boleto</h1>
      <Scanner />
      <p className="text-center text-neutral-400 text-sm">Apunta la cámara al código QR.</p>
    </main>
  );
}
