import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { listarSedes, sedesActivas } from "@/domain/sedesQuery";
import { crearSede, editarSede, toggleSedeActiva } from "@/domain/sedes";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("dominio de sedes", () => {
  it("crea y lista sedes ordenadas", async () => {
    const t = await createTestDb(); close = t.close;
    await crearSede(t.db, "MEGAMALL");
    await crearSede(t.db, "DANLI");
    const todas = await listarSedes(t.db);
    expect(todas.map((s) => s.nombre)).toEqual(["DANLI", "MEGAMALL"]);
    expect(todas[0].activo).toBe(true);
  });

  it("rechaza nombre duplicado y vacío", async () => {
    const t = await createTestDb(); close = t.close;
    await crearSede(t.db, "MEGAMALL");
    expect(await crearSede(t.db, "MEGAMALL")).toEqual({ error: "Ya existe una sede con ese nombre." });
    expect(await crearSede(t.db, "   ")).toEqual({ error: "El nombre es obligatorio." });
  });

  it("edita el nombre de una sede", async () => {
    const t = await createTestDb(); close = t.close;
    const c = await crearSede(t.db, "PLAZA");
    if ("error" in c) throw new Error(c.error);
    expect(await editarSede(t.db, c.id, "PLAZA AMERICA")).toEqual({ ok: true });
    const [s] = await listarSedes(t.db);
    expect(s.nombre).toBe("PLAZA AMERICA");
  });

  it("toggleSedeActiva alterna y sedesActivas excluye inactivas", async () => {
    const t = await createTestDb(); close = t.close;
    const a = await crearSede(t.db, "MEGAMALL");
    await crearSede(t.db, "DANLI");
    if ("error" in a) throw new Error(a.error);
    await toggleSedeActiva(t.db, a.id);
    const activas = await sedesActivas(t.db);
    expect(activas.map((s) => s.nombre)).toEqual(["DANLI"]);
    expect(await listarSedes(t.db)).toHaveLength(2);
  });
});
