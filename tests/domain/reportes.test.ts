import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { empresas, sedes, usuarios } from "@/db/schema";
import { generarLote, canjearBoleto, anularLote } from "@/domain/boletos";
import { reportePorEmpresa, listarCanjes, detalleEmpresa } from "@/domain/reportes";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("reportePorEmpresa", () => {
  it("cuadra emitidos = canjeados + pendientes (sin anulados)", async () => {
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

  it("emitidos excluye los boletos anulados, aunque sigue contando anulados aparte", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Coca-Cola", prefijo: "CC" }).returning();
    const [sede] = await t.db.insert(sedes).values({ nombre: "DANLI" }).returning();
    const [u] = await t.db.insert(usuarios).values({ usuario: "t", passwordHash: "x", rol: "taquilla", sedeId: sede.id }).returning();
    const lote = await generarLote(t.db, { empresaId: emp.id, descripcion: "L", cantidad: 5, fechaVencimiento: "2026-12-31" });
    await canjearBoleto(t.db, lote.boletos[0].token, { sedeId: sede.id, usuarioId: u.id, portadorNombre: "A", portadorDni: "1" }, "2026-07-16");
    await anularLote(t.db, lote.loteId, { motivo: "cancelado", usuarioId: u.id });

    const rep = await reportePorEmpresa(t.db);
    expect(rep).toHaveLength(1);
    // 1 canjeado (anularLote no toca canjeados) + 0 pendientes (los 4 activos -> anulados) = 1
    expect(rep[0]).toMatchObject({ empresa: "Coca-Cola", emitidos: 1, canjeados: 1, pendientes: 0, anulados: 4 });
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

describe("detalleEmpresa", () => {
  it("retorna datos de empresa, lotes con conteos y sus canjes", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({
      nombre: "Coca-Cola", prefijo: "CC", contacto: "Ana", telefono: "9999-0000",
    }).returning();
    const [sede] = await t.db.insert(sedes).values({ nombre: "DANLI" }).returning();
    const [u] = await t.db.insert(usuarios).values({ usuario: "t", passwordHash: "x", puedeTaquilla: true }).returning();

    const lote1 = await generarLote(t.db, { empresaId: emp.id, descripcion: "L1", cantidad: 4, fechaVencimiento: "2099-12-31" });
    await canjearBoleto(t.db, lote1.boletos[0].token, { sedeId: sede.id, usuarioId: u.id, portadorNombre: "Juan", portadorDni: "0801" });

    const lote2 = await generarLote(t.db, { empresaId: emp.id, descripcion: "L2", cantidad: 2, fechaVencimiento: "2099-12-31" });
    await anularLote(t.db, lote2.loteId, { motivo: "cancelado", usuarioId: u.id });

    const detalle = await detalleEmpresa(t.db, emp.id);
    expect(detalle).not.toBeNull();
    expect(detalle!.empresa).toMatchObject({
      id: emp.id, nombre: "Coca-Cola", prefijo: "CC", contacto: "Ana", telefono: "9999-0000",
    });

    expect(detalle!.lotes).toHaveLength(2);
    const l1 = detalle!.lotes.find((l) => l.id === lote1.loteId)!;
    expect(l1).toMatchObject({ descripcion: "L1", cantidad: 4, emitidos: 4, canjeados: 1, pendientes: 3, anulado: false });
    const l2 = detalle!.lotes.find((l) => l.id === lote2.loteId)!;
    // lote2 quedó 100% anulado: emitidos excluye anulados (0 canjeados + 0 pendientes).
    expect(l2).toMatchObject({ descripcion: "L2", cantidad: 2, emitidos: 0, canjeados: 0, pendientes: 0, anulado: true });

    expect(detalle!.canjes).toHaveLength(1);
    expect(detalle!.canjes[0]).toMatchObject({ empresa: "Coca-Cola", sede: "DANLI", portadorNombre: "Juan" });
  });

  it("retorna null si la empresa no existe", async () => {
    const t = await createTestDb(); close = t.close;
    const detalle = await detalleEmpresa(t.db, 999);
    expect(detalle).toBeNull();
  });
});
