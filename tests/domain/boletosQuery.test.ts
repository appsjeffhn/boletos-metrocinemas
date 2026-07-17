import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { empresas } from "@/db/schema";
import { generarLote } from "@/domain/boletos";
import { boletosDeLote } from "@/domain/boletosQuery";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("boletosDeLote", () => {
  it("trae código y token de cada boleto del lote", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "X", prefijo: "X" }).returning();
    const lote = await generarLote(t.db, { empresaId: emp.id, descripcion: "L", cantidad: 3, fechaVencimiento: "2026-12-31" });
    const filas = await boletosDeLote(t.db, lote.loteId);
    expect(filas).toHaveLength(3);
    expect(filas[0]).toHaveProperty("codigo");
    expect(filas[0]).toHaveProperty("token");
  });
});
