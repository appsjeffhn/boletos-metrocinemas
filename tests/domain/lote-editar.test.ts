import { describe, it, expect, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/test/db";
import { empresas, boletos, lotes, sedes, loteSedes, usuarios } from "@/db/schema";
import { generarLote, canjearBoleto, editarLote, eliminarLote, loteTieneCanjes } from "@/domain/boletos";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("loteTieneCanjes", () => {
  it("false si no hay boletos canjeados", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Coca-Cola", prefijo: "CC" }).returning();
    const lote = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L", cantidad: 3, fechaVencimiento: "2026-12-31",
    });
    expect(await loteTieneCanjes(t.db, lote.loteId)).toBe(false);
  });

  it("true si al menos un boleto está canjeado", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Coca-Cola", prefijo: "CC" }).returning();
    const [sede] = await t.db.insert(sedes).values({ nombre: "MEGAMALL" }).returning();
    const [u] = await t.db.insert(usuarios).values({ usuario: "t", passwordHash: "x", puedeTaquilla: true }).returning();
    const lote = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L", cantidad: 3, fechaVencimiento: "2026-12-31",
    });
    await canjearBoleto(t.db, lote.boletos[0].token, {
      sedeId: sede.id, usuarioId: u.id, portadorNombre: "Ana", portadorDni: "1",
    });
    expect(await loteTieneCanjes(t.db, lote.loteId)).toBe(true);
  });
});

describe("editarLote", () => {
  it("actualiza descripcion/fechaVencimiento, reemplaza sedes y regenera boletos con códigos nuevos", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Coca-Cola", prefijo: "CC" }).returning();
    const sedesCreadas = await t.db.insert(sedes)
      .values([{ nombre: "Multiplaza" }, { nombre: "Metrocentro" }])
      .returning();
    const [multiplaza, metrocentro] = sedesCreadas;

    const original = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "Original", cantidad: 3,
      fechaVencimiento: "2026-12-31", sedeIds: [multiplaza.id],
    });
    const codigosOriginales = new Set(original.boletos.map((b) => b.codigo));
    const tokensOriginales = new Set(original.boletos.map((b) => b.token));

    const res = await editarLote(t.db, original.loteId, {
      descripcion: "Editado", fechaVencimiento: "2027-01-15", cantidad: 5,
      sedeIds: [metrocentro.id],
    });

    expect(res.loteId).toBe(original.loteId);
    expect(res.boletos).toHaveLength(5);
    expect(res.boletos.every((b) => b.codigo.startsWith("MCC-"))).toBe(true);
    // ningún código/token nuevo coincide con los originales (regeneración real)
    expect(res.boletos.some((b) => codigosOriginales.has(b.codigo))).toBe(false);
    expect(res.boletos.some((b) => tokensOriginales.has(b.token))).toBe(false);

    const [loteRow] = await t.db.select().from(lotes).where(eq(lotes.id, original.loteId));
    expect(loteRow.descripcion).toBe("Editado");
    expect(loteRow.fechaVencimiento).toBe("2027-01-15");
    expect(loteRow.cantidad).toBe(5);

    const boletosEnDb = await t.db.select().from(boletos).where(eq(boletos.loteId, original.loteId));
    expect(boletosEnDb).toHaveLength(5);
    expect(boletosEnDb.every((b) => b.estado === "activo")).toBe(true);

    const sedesFilas = await t.db.select().from(loteSedes).where(eq(loteSedes.loteId, original.loteId));
    expect(sedesFilas.map((f) => f.sedeId)).toEqual([metrocentro.id]);
  });

  it("sedeIds vacío/omitido deja el lote válido en todas las sedes", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Coca-Cola", prefijo: "CC" }).returning();
    const [sede] = await t.db.insert(sedes).values({ nombre: "Multiplaza" }).returning();
    const original = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "Original", cantidad: 2,
      fechaVencimiento: "2026-12-31", sedeIds: [sede.id],
    });

    await editarLote(t.db, original.loteId, {
      descripcion: "Editado", fechaVencimiento: "2027-01-15", cantidad: 2,
    });

    const sedesFilas = await t.db.select().from(loteSedes).where(eq(loteSedes.loteId, original.loteId));
    expect(sedesFilas).toHaveLength(0);
  });

  it("lanza error si el lote tiene canjes y no modifica nada", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Coca-Cola", prefijo: "CC" }).returning();
    const [sede] = await t.db.insert(sedes).values({ nombre: "MEGAMALL" }).returning();
    const [u] = await t.db.insert(usuarios).values({ usuario: "t", passwordHash: "x", puedeTaquilla: true }).returning();
    const lote = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L", cantidad: 2, fechaVencimiento: "2026-12-31",
    });
    await canjearBoleto(t.db, lote.boletos[0].token, {
      sedeId: sede.id, usuarioId: u.id, portadorNombre: "Ana", portadorDni: "1",
    });

    await expect(editarLote(t.db, lote.loteId, {
      descripcion: "Editado", fechaVencimiento: "2027-01-15", cantidad: 5,
    })).rejects.toThrow("No se puede editar un lote con canjes");

    const [loteRow] = await t.db.select().from(lotes).where(eq(lotes.id, lote.loteId));
    expect(loteRow.descripcion).toBe("L");
    const boletosEnDb = await t.db.select().from(boletos).where(eq(boletos.loteId, lote.loteId));
    expect(boletosEnDb).toHaveLength(2);
  });
});

describe("eliminarLote", () => {
  it("elimina loteSedes, boletos y el lote", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Coca-Cola", prefijo: "CC" }).returning();
    const [sede] = await t.db.insert(sedes).values({ nombre: "MEGAMALL" }).returning();
    const lote = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L", cantidad: 3,
      fechaVencimiento: "2026-12-31", sedeIds: [sede.id],
    });

    const res = await eliminarLote(t.db, lote.loteId);
    expect(res).toEqual({ ok: true });

    const lotesEnDb = await t.db.select().from(lotes).where(eq(lotes.id, lote.loteId));
    expect(lotesEnDb).toHaveLength(0);
    const boletosEnDb = await t.db.select().from(boletos).where(eq(boletos.loteId, lote.loteId));
    expect(boletosEnDb).toHaveLength(0);
    const sedesFilas = await t.db.select().from(loteSedes).where(eq(loteSedes.loteId, lote.loteId));
    expect(sedesFilas).toHaveLength(0);
  });

  it("lanza error si el lote tiene canjes y no elimina nada", async () => {
    const t = await createTestDb(); close = t.close;
    const [emp] = await t.db.insert(empresas).values({ nombre: "Coca-Cola", prefijo: "CC" }).returning();
    const [sede] = await t.db.insert(sedes).values({ nombre: "MEGAMALL" }).returning();
    const [u] = await t.db.insert(usuarios).values({ usuario: "t", passwordHash: "x", puedeTaquilla: true }).returning();
    const lote = await generarLote(t.db, {
      empresaId: emp.id, descripcion: "L", cantidad: 2, fechaVencimiento: "2026-12-31",
    });
    await canjearBoleto(t.db, lote.boletos[0].token, {
      sedeId: sede.id, usuarioId: u.id, portadorNombre: "Ana", portadorDni: "1",
    });

    await expect(eliminarLote(t.db, lote.loteId)).rejects.toThrow("No se puede eliminar un lote con canjes");

    const lotesEnDb = await t.db.select().from(lotes).where(eq(lotes.id, lote.loteId));
    expect(lotesEnDb).toHaveLength(1);
  });
});
