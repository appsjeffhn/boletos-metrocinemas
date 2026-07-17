import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { empresas, sedes, usuarios } from "@/db/schema";
import { generarLote, canjearBoleto, anularLote } from "@/domain/boletos";
import { dashboardKpis } from "@/domain/dashboard";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("dashboardKpis", () => {
  it("cuadra conteos, lotesActivos, canjesPorSede y ultimosCanjes", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Coca-Cola", prefijo: "CC" }).returning();
    const [sedeA] = await t.db.insert(sedes).values({ nombre: "MEGAMALL" }).returning();
    const [sedeB] = await t.db.insert(sedes).values({ nombre: "DANLI" }).returning();
    const [u] = await t.db.insert(usuarios).values({
      usuario: "taq1", passwordHash: "x", puedeTaquilla: true,
    }).returning();

    // Lote 1: 5 boletos, 2 canjeados (1 en cada sede), 3 pendientes -> queda "activo"
    const lote1 = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L1", cantidad: 5, fechaVencimiento: "2099-12-31",
    });
    await canjearBoleto(t.db, lote1.boletos[0].token, {
      sedeId: sedeA.id, usuarioId: u.id, portadorNombre: "Ana", portadorDni: "1",
    });
    await canjearBoleto(t.db, lote1.boletos[1].token, {
      sedeId: sedeB.id, usuarioId: u.id, portadorNombre: "Beto", portadorDni: "2",
    });

    // Lote 2: 3 boletos, todos canjeados, luego anulado -> anularLote no debe tocar
    // los canjeados y el lote no cuenta como "activo" (no tiene boletos en estado 'activo').
    const lote2 = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L2", cantidad: 3, fechaVencimiento: "2099-12-31",
    });
    for (const b of lote2.boletos) {
      await canjearBoleto(t.db, b.token, {
        sedeId: sedeA.id, usuarioId: u.id, portadorNombre: "Carlos", portadorDni: "3",
      });
    }
    await anularLote(t.db, lote2.loteId, { motivo: "sin boletos activos que anular", usuarioId: u.id });

    // Lote 3: 2 boletos, anulado completo (ambos activos -> anulados). No debe contar como activo.
    const lote3 = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L3", cantidad: 2, fechaVencimiento: "2099-12-31",
    });
    await anularLote(t.db, lote3.loteId, { motivo: "cancelado", usuarioId: u.id });

    const kpis = await dashboardKpis(t.db);

    expect(kpis.empresas).toBe(1);
    // Solo lote1 tiene boletos activos (pendientes) y no está anulado.
    expect(kpis.lotesActivos).toBe(1);

    const total = lote1.boletos.length + lote2.boletos.length + lote3.boletos.length;
    expect(kpis.boletosEmitidos).toBe(total);
    expect(kpis.boletosCanjeados + kpis.boletosPendientes + kpis.boletosAnulados).toBe(total);
    expect(kpis.boletosCanjeados).toBe(2 + 3); // lote1 (2) + lote2 (3)
    expect(kpis.boletosPendientes).toBe(3); // resto de lote1
    expect(kpis.boletosAnulados).toBe(2); // lote3

    // Todos los canjes ocurrieron "ahora" -> cuentan como canjesHoy.
    expect(kpis.canjesHoy).toBe(kpis.boletosCanjeados);

    const porSede = new Map(kpis.canjesPorSede.map((s) => [s.sede, s.canjeados]));
    expect(porSede.get("MEGAMALL")).toBe(1 + 3); // Ana + los 3 de Carlos
    expect(porSede.get("DANLI")).toBe(1); // Beto
    const sumaSedes = kpis.canjesPorSede.reduce((acc, s) => acc + s.canjeados, 0);
    expect(sumaSedes).toBe(kpis.boletosCanjeados);

    expect(kpis.ultimosCanjes.length).toBe(kpis.boletosCanjeados);
    expect(kpis.ultimosCanjes.length).toBeLessThanOrEqual(10);
    // Orden desc por fecha: la primera fila es la más reciente.
    for (let i = 1; i < kpis.ultimosCanjes.length; i++) {
      const anterior = kpis.ultimosCanjes[i - 1].fecha;
      const actual = kpis.ultimosCanjes[i].fecha;
      expect(anterior && actual ? anterior >= actual : true).toBe(true);
    }
    expect(kpis.ultimosCanjes.every((c) => c.empresa === "Coca-Cola")).toBe(true);
  });

  it("respeta el límite de 10 en ultimosCanjes", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Pepsi", prefijo: "PP" }).returning();
    const [sede] = await t.db.insert(sedes).values({ nombre: "MEGAMALL" }).returning();
    const [u] = await t.db.insert(usuarios).values({
      usuario: "taq1", passwordHash: "x", puedeTaquilla: true,
    }).returning();
    const lote = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L", cantidad: 15, fechaVencimiento: "2099-12-31",
    });
    for (const b of lote.boletos) {
      await canjearBoleto(t.db, b.token, {
        sedeId: sede.id, usuarioId: u.id, portadorNombre: "X", portadorDni: "0",
      });
    }
    const kpis = await dashboardKpis(t.db);
    expect(kpis.ultimosCanjes).toHaveLength(10);
  });

  it("empresas=0, lotesActivos=0 y todos los conteos en cero cuando no hay datos", async () => {
    const t = await createTestDb(); close = t.close;
    const kpis = await dashboardKpis(t.db);
    expect(kpis).toMatchObject({
      empresas: 0, lotesActivos: 0, boletosEmitidos: 0, boletosCanjeados: 0,
      boletosPendientes: 0, boletosAnulados: 0, canjesHoy: 0,
      canjesPorSede: [], ultimosCanjes: [],
    });
  });
});
