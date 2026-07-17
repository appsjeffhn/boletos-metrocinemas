import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { empresas, sedes, usuarios } from "@/db/schema";
import { generarLote, canjearBoleto } from "@/domain/boletos";
import { reportePorEmpresa, listarCanjes } from "@/domain/reportes";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("reportePorEmpresa", () => {
  it("cuadra emitidos = canjeados + pendientes + anulados", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Coca-Cola", prefijo: "CC" }).returning();
    const [sede] = await t.db.insert(sedes).values({ nombre: "DANLI" }).returning();
    const [u] = await t.db.insert(usuarios).values({ usuario: "t", passwordHash: "x", rol: "taquilla", sedeId: sede.id }).returning();
    const lote = await generarLote(t.db, { empresaId: emp.id, descripcion: "L", cantidad: 5, fechaVencimiento: "2026-12-31" });
    await canjearBoleto(t.db, lote.boletos[0].token, { sedeId: sede.id, usuarioId: u.id, portadorNombre: "A", portadorDni: "1" }, "2026-07-16");
    await canjearBoleto(t.db, lote.boletos[1].token, { sedeId: sede.id, usuarioId: u.id, portadorNombre: "B", portadorDni: "2" }, "2026-07-16");

    const rep = await reportePorEmpresa(t.db);
    expect(rep).toHaveLength(1);
    expect(rep[0]).toMatchObject({ empresa: "Coca-Cola", emitidos: 5, canjeados: 2, pendientes: 3, anulados: 0 });
  });
});

describe("listarCanjes", () => {
  it("filtra por empresa y trae los datos del portador", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Coca-Cola", prefijo: "CC" }).returning();
    const [sede] = await t.db.insert(sedes).values({ nombre: "DANLI" }).returning();
    const [u] = await t.db.insert(usuarios).values({ usuario: "t", passwordHash: "x", rol: "taquilla", sedeId: sede.id }).returning();
    const lote = await generarLote(t.db, { empresaId: emp.id, descripcion: "L", cantidad: 2, fechaVencimiento: "2026-12-31" });
    await canjearBoleto(t.db, lote.boletos[0].token, { sedeId: sede.id, usuarioId: u.id, portadorNombre: "Juan", portadorDni: "0801" }, "2026-07-16");

    const filas = await listarCanjes(t.db, { empresaId: emp.id });
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ empresa: "Coca-Cola", sede: "DANLI", portadorNombre: "Juan", portadorDni: "0801" });
  });
});
