import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { sedes, usuarios, usuarioSedes } from "@/db/schema";
import { listarUsuarios } from "@/domain/usuariosQuery";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("listarUsuarios", () => {
  it("devuelve capacidades y nombres de sedes asignadas, ordenados por usuario", async () => {
    const t = await createTestDb(); close = t.close;
    const [megamall] = await t.db.insert(sedes).values({ nombre: "MEGAMALL" }).returning();
    const [danli] = await t.db.insert(sedes).values({ nombre: "DANLI" }).returning();

    const [admin] = await t.db.insert(usuarios).values({
      usuario: "admin1", passwordHash: "x", puedeAdmin: true, puedeTaquilla: false,
    }).returning();
    const [taq] = await t.db.insert(usuarios).values({
      usuario: "taq1", passwordHash: "x", puedeAdmin: false, puedeTaquilla: true,
    }).returning();
    await t.db.insert(usuarioSedes).values([
      { usuarioId: taq.id, sedeId: megamall.id },
      { usuarioId: taq.id, sedeId: danli.id },
    ]);
    const [ambos] = await t.db.insert(usuarios).values({
      usuario: "ambos1", passwordHash: "x", puedeAdmin: true, puedeTaquilla: true, activo: false,
    }).returning();
    await t.db.insert(usuarioSedes).values([{ usuarioId: ambos.id, sedeId: megamall.id }]);

    const filas = await listarUsuarios(t.db);
    expect(filas.map((u) => u.usuario)).toEqual(["admin1", "ambos1", "taq1"]);

    const porAdmin = filas.find((u) => u.usuario === "admin1")!;
    expect(porAdmin).toMatchObject({ id: admin.id, puedeAdmin: true, puedeTaquilla: false, activo: true, sedes: [] });

    const porTaq = filas.find((u) => u.usuario === "taq1")!;
    expect(porTaq.puedeTaquilla).toBe(true);
    expect(new Set(porTaq.sedes)).toEqual(new Set(["MEGAMALL", "DANLI"]));

    const porAmbos = filas.find((u) => u.usuario === "ambos1")!;
    expect(porAmbos).toMatchObject({ puedeAdmin: true, puedeTaquilla: true, activo: false, sedes: ["MEGAMALL"] });
  });

  it("devuelve lista vacía cuando no hay usuarios", async () => {
    const t = await createTestDb(); close = t.close;
    const filas = await listarUsuarios(t.db);
    expect(filas).toEqual([]);
  });
});
