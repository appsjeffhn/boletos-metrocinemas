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
    const payload = { userId: 7, puedeAdmin: false, puedeTaquilla: true, sedeIds: [3, 5], activeSedeId: 3 };
    const t = await signSession(payload);
    const p = await verifySession(t);
    expect(p).toEqual(payload);
  });
  it("firma y verifica un admin sin sedes", async () => {
    const payload = { userId: 1, puedeAdmin: true, puedeTaquilla: false, sedeIds: [], activeSedeId: null };
    const t = await signSession(payload);
    const p = await verifySession(t);
    expect(p).toEqual(payload);
  });
  it("rechaza token manipulado", async () => {
    expect(await verifySession("basura.invalida.xyz")).toBeNull();
  });
});
