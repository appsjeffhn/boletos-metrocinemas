import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { empresas, sedes, usuarios, boletos } from "@/db/schema";
import { generarLote, obtenerBoletoPorToken, canjearBoleto } from "@/domain/boletos";
import { eq } from "drizzle-orm";

let close: () => Promise<void>;
afterEach(() => close?.());

async function setup(fechaVenc = "2026-12-31") {
  const t = await createTestDb(); close = t.close;
  const [emp] = await t.db.insert(empresas).values({ nombre: "Empresa X", prefijo: "EX" }).returning();
  const [sede] = await t.db.insert(sedes).values({ nombre: "MEGAMALL" }).returning();
  const [user] = await t.db.insert(usuarios).values({
    usuario: "taq1", passwordHash: "x", rol: "taquilla", sedeId: sede.id,
  }).returning();
  const lote = await generarLote(t.db, {
    empresaId: emp.id, descripcion: "L", cantidad: 1, fechaVencimiento: fechaVenc,
  });
  return { t, sede, user, token: lote.boletos[0].token };
}
const datos = (sedeId: number, usuarioId: number) => ({
  sedeId, usuarioId, portadorNombre: "Juan", portadorDni: "0801-1990-12345",
});

describe("obtenerBoletoPorToken", () => {
  it("token inexistente → invalido", async () => {
    const { t } = await setup();
    const r = await obtenerBoletoPorToken(t.db, "noexiste");
    expect(r).toEqual({ ok: false, razon: "invalido" });
  });
  it("activo válido → ok", async () => {
    const { t, token } = await setup();
    const r = await obtenerBoletoPorToken(t.db, token, "2026-07-16");
    expect(r.ok).toBe(true);
  });
  it("vencido → razon vencido", async () => {
    const { t, token } = await setup("2026-01-01");
    const r = await obtenerBoletoPorToken(t.db, token, "2026-07-16");
    expect(r).toMatchObject({ ok: false, razon: "vencido" });
  });
  it("activo y no vencido usando la fecha por defecto (hoy) → ok", async () => {
    const { t, token } = await setup("2099-12-31");
    const r = await obtenerBoletoPorToken(t.db, token);
    expect(r.ok).toBe(true);
  });
});

describe("canjearBoleto", () => {
  it("canjea un boleto activo y guarda los datos", async () => {
    const { t, sede, user, token } = await setup();
    const r = await canjearBoleto(t.db, token, datos(sede.id, user.id), "2026-07-16");
    expect(r.ok).toBe(true);
    const [b] = await t.db.select().from(boletos).where(eq(boletos.token, token));
    expect(b.estado).toBe("canjeado");
    expect(b.canjePortadorNombre).toBe("Juan");
    expect(b.canjeSedeId).toBe(sede.id);
  });
  it("no permite doble canje", async () => {
    const { t, sede, user, token } = await setup();
    const primero = await canjearBoleto(t.db, token, datos(sede.id, user.id), "2026-07-16");
    const segundo = await canjearBoleto(t.db, token, datos(sede.id, user.id), "2026-07-16");
    expect(primero.ok).toBe(true);
    expect(segundo).toMatchObject({ ok: false, razon: "canjeado" });
  });
  it("no permite doble canje concurrente (guardia atomica)", async () => {
    const { t, sede, user, token } = await setup();
    const [r1, r2] = await Promise.all([
      canjearBoleto(t.db, token, datos(sede.id, user.id), "2026-07-16"),
      canjearBoleto(t.db, token, datos(sede.id, user.id), "2026-07-16"),
    ]);
    const resultados = [r1, r2];
    const exitosos = resultados.filter((r) => r.ok === true);
    const fallidos = resultados.filter((r) => r.ok === false);
    expect(exitosos.length).toBe(1);
    expect(fallidos.length).toBe(1);
    expect(fallidos[0]).toMatchObject({ ok: false, razon: "canjeado" });

    const filas = await t.db.select().from(boletos).where(eq(boletos.token, token));
    expect(filas.length).toBe(1);
    expect(filas[0].estado).toBe("canjeado");
    const canjeados = filas.filter((b) => b.estado === "canjeado");
    expect(canjeados.length).toBe(1);
  });
  it("rechaza boleto vencido", async () => {
    const { t, sede, user, token } = await setup("2026-01-01");
    const r = await canjearBoleto(t.db, token, datos(sede.id, user.id), "2026-07-16");
    expect(r).toMatchObject({ ok: false, razon: "vencido" });
  });
  it("token inexistente → invalido", async () => {
    const { t, sede, user } = await setup();
    const r = await canjearBoleto(t.db, "noexiste", datos(sede.id, user.id), "2026-07-16");
    expect(r).toMatchObject({ ok: false, razon: "invalido" });
  });
});
