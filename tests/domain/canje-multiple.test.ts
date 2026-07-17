import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { empresas, sedes, usuarios, boletos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generarLote, canjearBoleto, canjearMultiple } from "@/domain/boletos";

let close: () => Promise<void>;
afterEach(() => close?.());

async function setup() {
  const t = await createTestDb(); close = t.close;
  const [emp] = await t.db.insert(empresas).values({ nombre: "Coca-Cola", prefijo: "CC" }).returning();
  const [sede] = await t.db.insert(sedes).values({ nombre: "MEGAMALL" }).returning();
  const [u] = await t.db.insert(usuarios).values({ usuario: "t", passwordHash: "x", puedeTaquilla: true }).returning();
  const lote = await generarLote(t.db, {
    empresaId: emp.id, descripcion: "L", cantidad: 5, fechaVencimiento: "2099-12-31",
  });
  return { t, sede, u, lote };
}
const datos = (sedeId: number, usuarioId: number) => ({
  sedeId, usuarioId, portadorNombre: "Juan", portadorDni: "0801",
});

describe("canjearMultiple", () => {
  it("canjea varios tokens válidos y retorna resultados/exitosos/fallidos correctos", async () => {
    const { t, sede, u, lote } = await setup();
    const tokens = lote.boletos.slice(0, 3).map((b) => b.token);

    const res = await canjearMultiple(t.db, tokens, datos(sede.id, u.id));

    expect(res.exitosos).toBe(3);
    expect(res.fallidos).toBe(0);
    expect(res.resultados).toHaveLength(3);
    expect(res.resultados.map((r) => r.token)).toEqual(tokens);
    expect(res.resultados.every((r) => r.ok === true)).toBe(true);
    expect(res.resultados.every((r) => typeof r.codigo === "string")).toBe(true);

    const canjeados = await t.db.select().from(boletos).where(eq(boletos.estado, "canjeado"));
    expect(canjeados).toHaveLength(3);
  });

  it("mezcla de tokens válidos y ya canjeados produce resultados por-token correctos", async () => {
    const { t, sede, u, lote } = await setup();
    const yaCanjeado = lote.boletos[0].token;
    await canjearBoleto(t.db, yaCanjeado, datos(sede.id, u.id));

    const tokens = [yaCanjeado, lote.boletos[1].token, lote.boletos[2].token];
    const res = await canjearMultiple(t.db, tokens, datos(sede.id, u.id));

    expect(res.exitosos).toBe(2);
    expect(res.fallidos).toBe(1);
    expect(res.resultados[0]).toMatchObject({ token: yaCanjeado, ok: false, razon: "canjeado" });
    expect(res.resultados[1]).toMatchObject({ token: lote.boletos[1].token, ok: true });
    expect(res.resultados[2]).toMatchObject({ token: lote.boletos[2].token, ok: true });
  });

  it("token inválido produce razon invalido sin afectar a los demás", async () => {
    const { t, sede, u, lote } = await setup();
    const tokens = [lote.boletos[0].token, "no-existe", lote.boletos[1].token];
    const res = await canjearMultiple(t.db, tokens, datos(sede.id, u.id));

    expect(res.exitosos).toBe(2);
    expect(res.fallidos).toBe(1);
    expect(res.resultados[1]).toMatchObject({ token: "no-existe", ok: false, razon: "invalido" });
  });

  it("de-duplica tokens repetidos preservando el orden de primera aparición", async () => {
    const { t, sede, u, lote } = await setup();
    const tokenA = lote.boletos[0].token;
    const tokenB = lote.boletos[1].token;
    const tokens = [tokenA, tokenB, tokenA];

    const res = await canjearMultiple(t.db, tokens, datos(sede.id, u.id));

    expect(res.resultados).toHaveLength(2);
    expect(res.resultados.map((r) => r.token)).toEqual([tokenA, tokenB]);
    expect(res.exitosos).toBe(2);
    expect(res.fallidos).toBe(0);
  });
});
