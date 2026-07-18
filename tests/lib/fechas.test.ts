import { describe, it, expect } from "vitest";
import { hoyISOEn, fechaISOEn } from "@/lib/fechas";

describe("fechas por zona horaria", () => {
  it("fechaISOEn ubica la fecha calendario según la zona", () => {
    // 2026-01-01T03:00:00Z: en UTC es día 1; en Tegucigalpa (UTC-6) aún es 2025-12-31 21:00.
    const d = new Date("2026-01-01T03:00:00Z");
    expect(fechaISOEn(d, "UTC")).toBe("2026-01-01");
    expect(fechaISOEn(d, "America/Tegucigalpa")).toBe("2025-12-31");
  });

  it("hoyISOEn devuelve formato YYYY-MM-DD", () => {
    expect(hoyISOEn("America/Tegucigalpa")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
