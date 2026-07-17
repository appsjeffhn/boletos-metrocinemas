import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { empresas } from "@/db/schema";
import { listarEmpresas } from "@/domain/empresasQuery";

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
