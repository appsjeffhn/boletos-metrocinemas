import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { zonaHoraria, guardarZonaHoraria } from "@/domain/configuracion";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("configuracion / zona horaria", () => {
  it("devuelve el default cuando no hay fila", async () => {
    const t = await createTestDb(); close = t.close;
    expect(await zonaHoraria(t.db)).toBe("America/Tegucigalpa");
  });

  it("guarda y lee una zona válida (upsert)", async () => {
    const t = await createTestDb(); close = t.close;
    expect(await guardarZonaHoraria(t.db, "America/Mexico_City")).toEqual({ ok: true });
    expect(await zonaHoraria(t.db)).toBe("America/Mexico_City");
    // segundo guardado actualiza la misma fila
    expect(await guardarZonaHoraria(t.db, "America/Guatemala")).toEqual({ ok: true });
    expect(await zonaHoraria(t.db)).toBe("America/Guatemala");
  });

  it("rechaza una zona fuera de la lista permitida", async () => {
    const t = await createTestDb(); close = t.close;
    expect(await guardarZonaHoraria(t.db, "Marte/Olympus")).toEqual({ error: "Zona horaria no válida." });
    expect(await zonaHoraria(t.db)).toBe("America/Tegucigalpa");
  });
});
