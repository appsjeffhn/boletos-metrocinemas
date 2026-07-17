import { describe, it, expect, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/test/db";
import { empresas, lotes, productos, loteProductos } from "@/db/schema";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("schema productos / lote_productos", () => {
  it("inserta un producto de catálogo con precio y activo por defecto", async () => {
    const t = await createTestDb(); close = t.close;
    const [p] = await t.db.insert(productos)
      .values({ nombre: "Entrada 3D", detalle: "Sala normal", precio: "120.00" })
      .returning();
    expect(p.nombre).toBe("Entrada 3D");
    expect(p.detalle).toBe("Sala normal");
    expect(Number(p.precio)).toBe(120);
    expect(p.activo).toBe(true);
  });

  it("inserta lote_productos copiando datos y con cantidadPorBoleto/orden por defecto", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Coca-Cola", prefijo: "CC" }).returning();
    const [lote] = await t.db.insert(lotes)
      .values({ empresaId: emp.id, descripcion: "L", cantidad: 10, fechaVencimiento: "2026-12-31" })
      .returning();
    const [lp] = await t.db.insert(loteProductos)
      .values({ loteId: lote.id, nombre: "Entrada 3D", precioUnitario: "100.00", cantidadPorBoleto: 2 })
      .returning();
    expect(lp.loteId).toBe(lote.id);
    expect(lp.productoId).toBeNull();
    expect(lp.cantidadPorBoleto).toBe(2);
    expect(lp.orden).toBe(0);
    const filas = await t.db.select().from(loteProductos).where(eq(loteProductos.loteId, lote.id));
    expect(filas).toHaveLength(1);
  });
});
