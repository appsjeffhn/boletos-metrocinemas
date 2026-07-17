import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { empresas, sedes, usuarios, boletos } from "@/db/schema";
import { generarLote, anularLote, canjearBoleto } from "@/domain/boletos";
import { reportePorEmpresa } from "@/domain/reportes";
import { eq } from "drizzle-orm";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("anularLote", () => {
  it("anula los boletos activos de un lote sin tocar los ya canjeados", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Empresa Y", prefijo: "EY" }).returning();
    const [sede] = await t.db.insert(sedes).values({ nombre: "MEGAMALL" }).returning();
    const [user] = await t.db.insert(usuarios).values({
      usuario: "taq1", passwordHash: "x", rol: "taquilla", sedeId: sede.id,
    }).returning();
    const lote = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L", cantidad: 3, fechaVencimiento: "2099-12-31",
    });

    const canjeado = lote.boletos[0];
    const r = await canjearBoleto(t.db, canjeado.token, {
      sedeId: sede.id, usuarioId: user.id, portadorNombre: "Juan", portadorDni: "0801-1990-12345",
    }, "2026-07-16");
    expect(r.ok).toBe(true);

    const { anulados } = await anularLote(t.db, lote.loteId);
    expect(anulados).toBe(2);

    const filas = await t.db.select().from(boletos).where(eq(boletos.loteId, lote.loteId));
    const porCodigo = new Map(filas.map((b) => [b.codigo, b.estado]));
    expect(porCodigo.get(canjeado.codigo)).toBe("canjeado");
    const otros = filas.filter((b) => b.codigo !== canjeado.codigo);
    expect(otros).toHaveLength(2);
    expect(otros.every((b) => b.estado === "anulado")).toBe(true);

    const reporte = await reportePorEmpresa(t.db);
    const fila = reporte.find((f) => f.empresaId === emp.id);
    expect(fila).toMatchObject({ canjeados: 1, anulados: 2, pendientes: 0, emitidos: 3 });
  });
});
