import { describe, it, expect } from "vitest";
import { generarCodigo, generarToken, normalizarPrefijo } from "@/lib/codigo";

describe("normalizarPrefijo", () => {
  it("deriva iniciales en mayúsculas, máx 6, sin símbolos", () => {
    expect(normalizarPrefijo("MOK")).toBe("MOK");
    expect(normalizarPrefijo("coca cola")).toBe("COCACO");
    expect(normalizarPrefijo("!!!")).toBe("X");
  });
});

describe("generarCodigo", () => {
  it("cumple el formato M{PREFIJO}-XXXXXX sin caracteres ambiguos", () => {
    for (let i = 0; i < 200; i++) {
      expect(generarCodigo("MOK")).toMatch(/^MMOK-[0-9ABCDEFGHJKMNPQRSTVWXYZ]{6}$/);
    }
    expect(generarCodigo("CC")).toMatch(/^MCC-[0-9ABCDEFGHJKMNPQRSTVWXYZ]{6}$/);
  });
  it("normaliza el prefijo recibido", () => {
    expect(generarCodigo("cc")).toMatch(/^MCC-/);
  });
  it("genera valores altamente únicos", () => {
    const set = new Set(Array.from({ length: 5000 }, () => generarCodigo("MOK")));
    expect(set.size).toBeGreaterThan(4990);
  });
});

describe("generarToken", () => {
  it("es hex de 32 chars y único", () => {
    const a = generarToken();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toBe(generarToken());
  });
});
