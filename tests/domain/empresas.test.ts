import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { empresas, sedes, usuarios } from "@/db/schema";
import { listarEmpresas, empresaTieneLotesActivos } from "@/domain/empresasQuery";
import { generarLote, canjearBoleto, anularLote } from "@/domain/boletos";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("listarEmpresas", () => {
  it("devuelve empresas ordenadas por nombre", async () => {
    const t = await createTestDb(); close = t.close;
    await t.db.insert(empresas).values([{ nombre: "Zeta", prefijo: "Z" }, { nombre: "Alfa", prefijo: "A" }]);
    const filas = await listarEmpresas(t.db);
    expect(filas.map((e) => e.nombre)).toEqual(["Alfa", "Zeta"]);
  });
});

describe("empresaTieneLotesActivos", () => {
  it("true cuando la empresa tiene un lote no anulado con boletos activos", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Coca-Cola", prefijo: "CC" }).returning();
    await generarLote(t.db, { empresaId: emp.id, descripcion: "L", cantidad: 3, fechaVencimiento: "2099-12-31" });

    expect(await empresaTieneLotesActivos(t.db, emp.id)).toBe(true);
  });

  it("false cuando todos los boletos del lote están canjeados o anulados", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Pepsi", prefijo: "PP" }).returning();
    const [sede] = await t.db.insert(sedes).values({ nombre: "DANLI" }).returning();
    const [u] = await t.db.insert(usuarios).values({ usuario: "t", passwordHash: "x", puedeTaquilla: true }).returning();
    const lote = await generarLote(t.db, { empresaId: emp.id, descripcion: "L", cantidad: 2, fechaVencimiento: "2099-12-31" });
    await canjearBoleto(t.db, lote.boletos[0].token, { sedeId: sede.id, usuarioId: u.id, portadorNombre: "A", portadorDni: "1" });
    await anularLote(t.db, lote.loteId, { motivo: "cierre", usuarioId: u.id });

    expect(await empresaTieneLotesActivos(t.db, emp.id)).toBe(false);
  });

  it("false cuando la empresa no tiene lotes", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Fanta", prefijo: "FF" }).returning();

    expect(await empresaTieneLotesActivos(t.db, emp.id)).toBe(false);
  });
});
