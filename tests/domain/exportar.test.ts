import { describe, it, expect } from "vitest";
import { aCsv } from "@/domain/exportar";

describe("aCsv", () => {
  it("genera encabezado y filas, escapando comas y comillas", () => {
    const csv = aCsv([
      { codigo: "MMOK-ABC123", empresa: "Coca, Cola", sede: "DANLI", portadorNombre: 'Juan "J"', portadorDni: "0801", fecha: new Date("2026-07-16T10:00:00Z") },
    ]);
    const [head, row] = csv.trim().split("\n");
    expect(head).toBe("codigo,empresa,sede,portadorNombre,portadorDni,fecha");
    expect(row).toContain('"Coca, Cola"');
    expect(row).toContain('"Juan ""J"""');
  });
});
