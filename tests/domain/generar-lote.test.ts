import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { empresas, boletos, lotes } from "@/db/schema";
import { generarLote } from "@/domain/boletos";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("generarLote", () => {
  it("crea N boletos únicos ligados a empresa y lote", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Coca-Cola", prefijo: "CC" }).returning();
    const res = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "Cortesías", cantidad: 50,
      fechaVencimiento: "2026-12-31",
    });
    expect(res.boletos).toHaveLength(50);
    const codigos = new Set(res.boletos.map((b) => b.codigo));
    const tokens = new Set(res.boletos.map((b) => b.token));
    expect(codigos.size).toBe(50);
    expect(tokens.size).toBe(50);
    expect(res.boletos.every((b) => b.codigo.startsWith("MCC-"))).toBe(true);
    const enDb = await t.db.select().from(boletos);
    expect(enDb).toHaveLength(50);
    expect(enDb.every((b) => b.estado === "activo")).toBe(true);
  });

  it("si falla la inserción de boletos, revierte (borra) el lote recién creado", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Pepsi", prefijo: "PP" }).returning();
    // cantidad: 0 hace que values([]) del insert de boletos lance sincrónicamente,
    // ejerciendo la rama de compensación (delete del lote) en generarLote.
    await expect(generarLote(t.db, {
      empresaId: emp.id, descripcion: "Cortesías", cantidad: 0,
      fechaVencimiento: "2026-12-31",
    })).rejects.toThrow();

    const lotesEnDb = await t.db.select().from(lotes);
    expect(lotesEnDb).toHaveLength(0);
  });
});
