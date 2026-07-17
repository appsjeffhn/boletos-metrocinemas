import { describe, it, expect } from "vitest";
import { totalizarProductos } from "@/domain/totalizar";

describe("totalizarProductos", () => {
  it("suma cantidadPorBoleto por producto entre boletos y lotes", () => {
    const r = totalizarProductos([
      { productos: [{ nombre: "Entrada 3D", cantidadPorBoleto: 2 }] },
      { productos: [{ nombre: "Entrada 3D", cantidadPorBoleto: 2 }] },
      { productos: [{ nombre: "Entrada 2D", cantidadPorBoleto: 1 }] },
    ]);
    expect(r).toEqual([
      { nombre: "Entrada 2D", cantidad: 1 },
      { nombre: "Entrada 3D", cantidad: 4 },
    ]);
  });

  it("agrupa ignorando mayúsculas/espacios y conserva el primer casing", () => {
    const r = totalizarProductos([
      { productos: [{ nombre: "Combo", cantidadPorBoleto: 1 }] },
      { productos: [{ nombre: " combo ", cantidadPorBoleto: 3 }] },
    ]);
    expect(r).toEqual([{ nombre: "Combo", cantidad: 4 }]);
  });

  it("devuelve arreglo vacío sin productos", () => {
    expect(totalizarProductos([{ productos: [] }])).toEqual([]);
  });
});
