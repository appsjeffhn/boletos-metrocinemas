import { describe, it, expect } from "vitest";
import { aCsvCanjesProductos } from "@/domain/exportarProductos";
import type { CanjeProductoRow } from "@/domain/reportesProductos";

describe("aCsvCanjesProductos", () => {
  it("genera encabezado y filas con importe", () => {
    const filas: CanjeProductoRow[] = [
      {
        producto: "Entrada 3D", fecha: new Date("2026-07-17T20:32:00Z"), sede: "DANLI",
        empresa: "Coca-Cola", loteId: 12, codigo: "MCC-ABC123", cantidad: 2,
        precioUnitario: 100, importe: 200, operador: "taquilla1",
      },
    ];
    const csv = aCsvCanjesProductos(filas);
    const lineas = csv.trim().split("\n");
    expect(lineas[0]).toBe("producto,empresa,sede,loteId,codigo,cantidad,precioUnitario,importe,operador,fecha");
    expect(lineas[1]).toContain("Entrada 3D,Coca-Cola,DANLI,12,MCC-ABC123,2,100,200,taquilla1,");
  });

  it("escapa comas y comillas", () => {
    const filas: CanjeProductoRow[] = [
      {
        producto: 'Combo "grande", 2', fecha: null, sede: null, empresa: "X", loteId: 1,
        codigo: "MX-1", cantidad: 1, precioUnitario: null, importe: null, operador: null,
      },
    ];
    const csv = aCsvCanjesProductos(filas);
    expect(csv).toContain('"Combo ""grande"", 2"');
  });
});
