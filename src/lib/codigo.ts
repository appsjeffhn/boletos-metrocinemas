import { randomBytes, randomInt } from "crypto";

const ALFABETO = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford, sin I L O U

export function normalizarPrefijo(nombre: string): string {
  const limpio = nombre.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  return limpio || "X";
}

export function generarCodigo(prefijo: string): string {
  const p = normalizarPrefijo(prefijo);
  let s = "";
  for (let i = 0; i < 6; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return `M${p}-${s}`;
}

export function generarToken(): string {
  return randomBytes(16).toString("hex");
}
