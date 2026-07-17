import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { listarProductos, nombresProductos } from "@/domain/productosQuery";
import { crearProducto, editarProducto, desactivarProducto } from "@/domain/productos";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("catálogo de productos", () => {
  it("crea y lista productos ordenados por nombre", async () => {
    const t = await createTestDb(); close = t.close;
    await crearProducto(t.db, { nombre: "Entrada 3D", precio: "120.00" });
    await crearProducto(t.db, { nombre: "Combo palomitas", detalle: "grande", precio: "90" });
    const lista = await listarProductos(t.db);
    expect(lista.map((p) => p.nombre)).toEqual(["Combo palomitas", "Entrada 3D"]);
    expect(lista[0].detalle).toBe("grande");
  });

  it("rechaza nombre duplicado", async () => {
    const t = await createTestDb(); close = t.close;
    await crearProducto(t.db, { nombre: "Entrada 3D" });
    const r = await crearProducto(t.db, { nombre: "Entrada 3D" });
    expect(r).toEqual({ error: "Ya existe un producto con ese nombre." });
  });

  it("rechaza nombre vacío", async () => {
    const t = await createTestDb(); close = t.close;
    const r = await crearProducto(t.db, { nombre: "   " });
    expect(r).toEqual({ error: "El nombre es obligatorio." });
  });

  it("edita un producto", async () => {
    const t = await createTestDb(); close = t.close;
    const c = await crearProducto(t.db, { nombre: "Entrada 2D", precio: "80" });
    if ("error" in c) throw new Error(c.error);
    const r = await editarProducto(t.db, c.id, { nombre: "Entrada 2D", precio: "85" });
    expect(r).toEqual({ ok: true });
    const [p] = await listarProductos(t.db);
    expect(Number(p.precio)).toBe(85);
  });

  it("nombresProductos solo devuelve activos", async () => {
    const t = await createTestDb(); close = t.close;
    const a = await crearProducto(t.db, { nombre: "Entrada 3D" });
    await crearProducto(t.db, { nombre: "Combo" });
    if ("error" in a) throw new Error(a.error);
    await desactivarProducto(t.db, a.id);
    const nombres = await nombresProductos(t.db);
    expect(nombres).toEqual(["Combo"]);
  });
});
