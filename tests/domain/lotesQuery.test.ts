import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { empresas } from "@/db/schema";
import { generarLote } from "@/domain/boletos";
import { listarLotes } from "@/domain/lotesQuery";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("listarLotes", () => {
  it("lista lotes con nombre de empresa y cantidad", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Pepsi", prefijo: "PEP" }).returning();
    await generarLote(t.db, { empresaId: emp.id, descripcion: "Agosto", cantidad: 3, fechaVencimiento: "2026-12-31" });
    const filas = await listarLotes(t.db);
    expect(filas[0]).toMatchObject({ empresa: "Pepsi", descripcion: "Agosto", cantidad: 3 });
  });
});
