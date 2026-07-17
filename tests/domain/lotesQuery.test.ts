import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { empresas, sedes, usuarios } from "@/db/schema";
import { generarLote, canjearBoleto } from "@/domain/boletos";
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

  it("marca tieneCanjes según si el lote tiene boletos canjeados", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Pepsi", prefijo: "PEP" }).returning();
    const [sede] = await t.db.insert(sedes).values({ nombre: "MEGAMALL" }).returning();
    const [u] = await t.db.insert(usuarios).values({ usuario: "t", passwordHash: "x", puedeTaquilla: true }).returning();

    const sinCanjes = await generarLote(t.db, { empresaId: emp.id, descripcion: "Sin canjes", cantidad: 2, fechaVencimiento: "2026-12-31" });
    const conCanjes = await generarLote(t.db, { empresaId: emp.id, descripcion: "Con canjes", cantidad: 2, fechaVencimiento: "2026-12-31" });
    await canjearBoleto(t.db, conCanjes.boletos[0].token, {
      sedeId: sede.id, usuarioId: u.id, portadorNombre: "Ana", portadorDni: "1",
    });

    const filas = await listarLotes(t.db);
    const filaSinCanjes = filas.find((f) => f.id === sinCanjes.loteId)!;
    const filaConCanjes = filas.find((f) => f.id === conCanjes.loteId)!;
    expect(filaSinCanjes.tieneCanjes).toBe(false);
    expect(filaConCanjes.tieneCanjes).toBe(true);
  });
});
