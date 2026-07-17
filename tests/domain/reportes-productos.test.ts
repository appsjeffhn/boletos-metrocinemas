import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { empresas, sedes, usuarios } from "@/db/schema";
import { generarLote, canjearBoleto } from "@/domain/boletos";
import { resumenProductos, detalleCanjesProductos } from "@/domain/reportesProductos";

let close: () => Promise<void>;
afterEach(() => close?.());

async function setup(db: Awaited<ReturnType<typeof createTestDb>>["db"]) {
  const [emp] = await db.insert(empresas).values({ nombre: "Coca-Cola", prefijo: "CC" }).returning();
  const [sede] = await db.insert(sedes).values({ nombre: "DANLI" }).returning();
  const [u] = await db.insert(usuarios).values({ usuario: "t", passwordHash: "x", puedeTaquilla: true }).returning();
  return { emp, sede, u };
}

describe("resumenProductos", () => {
  it("cuenta creados/canjeados/pendientes por producto con cantidadPorBoleto y montos", async () => {
    const t = await createTestDb(); close = t.close;
    const { emp, sede, u } = await setup(t.db);
    const lote = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L", cantidad: 5, fechaVencimiento: "2099-12-31",
      productos: [{ nombre: "Entrada 3D", precioUnitario: "100.00", cantidadPorBoleto: 2 }],
    });
    await canjearBoleto(t.db, lote.boletos[0].token, { sedeId: sede.id, usuarioId: u.id, portadorNombre: "A", portadorDni: "1" });

    const res = await resumenProductos(t.db, {});
    expect(res).toHaveLength(1);
    // 5 boletos × 2 = 10 creados; 1 canjeado × 2 = 2; pendientes = 8
    expect(res[0]).toMatchObject({ nombre: "Entrada 3D", creados: 10, canjeados: 2, pendientes: 8 });
    expect(res[0].montoCreado).toBe(1000);
    expect(res[0].montoCanjeado).toBe(200);
    expect(res[0].montoPendiente).toBe(800);
  });

  it("agrupa el mismo producto entre lotes por productoId", async () => {
    const t = await createTestDb(); close = t.close;
    const { emp } = await setup(t.db);
    await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L1", cantidad: 3, fechaVencimiento: "2099-12-31",
      productos: [{ productoId: null, nombre: "Combo", cantidadPorBoleto: 1 }],
    });
    await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L2", cantidad: 2, fechaVencimiento: "2099-12-31",
      productos: [{ productoId: null, nombre: "combo", cantidadPorBoleto: 1 }],
    });
    const res = await resumenProductos(t.db, {});
    // "Combo" y "combo" (ad-hoc, productoId null) se agrupan por nombre normalizado
    expect(res).toHaveLength(1);
    expect(res[0].creados).toBe(5);
  });

  it("trata precio null como 0 en los montos", async () => {
    const t = await createTestDb(); close = t.close;
    const { emp } = await setup(t.db);
    await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L", cantidad: 4, fechaVencimiento: "2099-12-31",
      productos: [{ nombre: "Sin precio", cantidadPorBoleto: 1 }],
    });
    const res = await resumenProductos(t.db, {});
    expect(res[0].montoCreado).toBe(0);
  });
});

describe("detalleCanjesProductos", () => {
  it("devuelve una fila por canje×producto con importe y filtra por empresa", async () => {
    const t = await createTestDb(); close = t.close;
    const { emp, sede, u } = await setup(t.db);
    const lote = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L", cantidad: 2, fechaVencimiento: "2099-12-31",
      productos: [
        { nombre: "Entrada 3D", precioUnitario: "100", cantidadPorBoleto: 2 },
        { nombre: "Combo", precioUnitario: "50", cantidadPorBoleto: 1 },
      ],
    });
    await canjearBoleto(t.db, lote.boletos[0].token, { sedeId: sede.id, usuarioId: u.id, portadorNombre: "Juan", portadorDni: "1" });

    const filas = await detalleCanjesProductos(t.db, { empresaId: emp.id });
    // 1 canje × 2 productos = 2 filas
    expect(filas).toHaveLength(2);
    const e3d = filas.find((f) => f.producto === "Entrada 3D")!;
    expect(e3d).toMatchObject({ empresa: "Coca-Cola", sede: "DANLI", cantidad: 2, operador: "t" });
    expect(e3d.importe).toBe(200);
  });
});
