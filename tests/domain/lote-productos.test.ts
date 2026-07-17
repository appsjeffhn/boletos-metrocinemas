import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { empresas, sedes, usuarios, boletos } from "@/db/schema";
import { generarLote, editarProductosLote, canjearBoleto } from "@/domain/boletos";
import { productosDeLote, productosPorToken } from "@/domain/loteProductosQuery";

let close: () => Promise<void>;
afterEach(() => close?.());

async function baseEmpresa(db: Awaited<ReturnType<typeof createTestDb>>["db"]) {
  const [emp] = await db.insert(empresas).values({ nombre: "Coca-Cola", prefijo: "CC" }).returning();
  return emp;
}

describe("productos por lote", () => {
  it("generarLote guarda los productos del lote", async () => {
    const t = await createTestDb(); close = t.close;
    const emp = await baseEmpresa(t.db);
    const res = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L", cantidad: 5, fechaVencimiento: "2026-12-31",
      productos: [
        { nombre: "Entrada 3D", detalle: "Sala normal", precioUnitario: "120.00", cantidadPorBoleto: 2 },
        { nombre: "Combo", precioUnitario: "90", cantidadPorBoleto: 1 },
      ],
    });
    const prods = await productosDeLote(t.db, res.loteId);
    expect(prods).toHaveLength(2);
    expect(prods[0]).toMatchObject({ nombre: "Entrada 3D", detalle: "Sala normal", cantidadPorBoleto: 2 });
    expect(Number(prods[0].precioUnitario)).toBe(120);
  });

  it("productosPorToken devuelve los productos del lote del boleto sin precio", async () => {
    const t = await createTestDb(); close = t.close;
    const emp = await baseEmpresa(t.db);
    const res = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L", cantidad: 3, fechaVencimiento: "2026-12-31",
      productos: [{ nombre: "Entrada 3D", cantidadPorBoleto: 2 }],
    });
    const prods = await productosPorToken(t.db, res.boletos[0].token);
    expect(prods).toEqual([{ nombre: "Entrada 3D", detalle: null, cantidadPorBoleto: 2 }]);
  });

  it("editarProductosLote reemplaza los productos si no hay canjes", async () => {
    const t = await createTestDb(); close = t.close;
    const emp = await baseEmpresa(t.db);
    const res = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L", cantidad: 2, fechaVencimiento: "2026-12-31",
      productos: [{ nombre: "Entrada 2D", cantidadPorBoleto: 1 }],
    });
    const r = await editarProductosLote(t.db, res.loteId, [
      { nombre: "Entrada 3D", precioUnitario: "150", cantidadPorBoleto: 1 },
    ]);
    expect(r).toEqual({ ok: true });
    const prods = await productosDeLote(t.db, res.loteId);
    expect(prods).toHaveLength(1);
    expect(prods[0].nombre).toBe("Entrada 3D");
  });

  it("editarProductosLote se bloquea si el lote tiene canjes y NO cambia los productos", async () => {
    const t = await createTestDb(); close = t.close;
    const emp = await baseEmpresa(t.db);
    const [sede] = await t.db.insert(sedes).values({ nombre: "DANLI" }).returning();
    const [u] = await t.db.insert(usuarios).values({ usuario: "t", passwordHash: "x", puedeTaquilla: true }).returning();
    const res = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L", cantidad: 2, fechaVencimiento: "2099-12-31",
      productos: [{ nombre: "Entrada 2D", cantidadPorBoleto: 1 }],
    });
    await canjearBoleto(t.db, res.boletos[0].token, { sedeId: sede.id, usuarioId: u.id, portadorNombre: "A", portadorDni: "1" });
    const r = await editarProductosLote(t.db, res.loteId, [{ nombre: "Entrada 3D", cantidadPorBoleto: 1 }]);
    expect(r).toEqual({ error: "No se puede editar productos de un lote con canjes." });
    const prods = await productosDeLote(t.db, res.loteId);
    expect(prods[0].nombre).toBe("Entrada 2D");
    // los boletos siguen intactos (no se regeneran)
    const bs = await t.db.select().from(boletos);
    expect(bs).toHaveLength(2);
  });
});
