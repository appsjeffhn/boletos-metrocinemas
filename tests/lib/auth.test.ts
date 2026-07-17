import { describe, it, expect, beforeAll } from "vitest";
import { hashPassword, verifyPassword, signSession, verifySession } from "@/lib/auth";

beforeAll(() => { process.env.SESSION_SECRET = "test-secret-de-al-menos-32-caracteres!!"; });

describe("password", () => {
  it("verifica correcta e incorrecta", async () => {
    const h = await hashPassword("Secreta123");
    expect(await verifyPassword("Secreta123", h)).toBe(true);
    expect(await verifyPassword("mala", h)).toBe(false);
  });
});

describe("sesión", () => {
  it("firma y verifica el payload", async () => {
    const t = await signSession({ userId: 7, rol: "taquilla", sedeId: 3 });
    const p = await verifySession(t);
    expect(p).toEqual({ userId: 7, rol: "taquilla", sedeId: 3 });
  });
  it("rechaza token manipulado", async () => {
    expect(await verifySession("basura.invalida.xyz")).toBeNull();
  });
});
