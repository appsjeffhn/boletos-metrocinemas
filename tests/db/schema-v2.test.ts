import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { usuarios, sedes, usuarioSedes, empresas, lotes, loteSedes } from "@/db/schema";
import { eq } from "drizzle-orm";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("schema v2 (multi-sede, roles, teléfono, anulación)", () => {
  it("soporta usuario con puedeAdmin/puedeTaquilla, sedes asignadas, empresa con teléfono y lote con sedes", async () => {
    const t = await createTestDb();
    close = t.close;

    const [usuario] = await t.db
      .insert(usuarios)
      .values({
        usuario: "jperez",
        passwordHash: "hash",
        puedeAdmin: true,
        puedeTaquilla: true,
      })
      .returning();
    expect(usuario.rol).toBeNull();
    expect(usuario.puedeAdmin).toBe(true);
    expect(usuario.puedeTaquilla).toBe(true);

    const sedeFilas = await t.db
      .insert(sedes)
      .values([{ nombre: "MEGAMALL" }, { nombre: "CITY MALL" }])
      .returning();
    expect(sedeFilas).toHaveLength(2);

    await t.db.insert(usuarioSedes).values(
      sedeFilas.map((s) => ({ usuarioId: usuario.id, sedeId: s.id }))
    );
    const asignaciones = await t.db
      .select()
      .from(usuarioSedes)
      .where(eq(usuarioSedes.usuarioId, usuario.id));
    expect(asignaciones).toHaveLength(2);
    expect(asignaciones.map((a) => a.sedeId).sort()).toEqual(
      sedeFilas.map((s) => s.id).sort()
    );

    const [empresa] = await t.db
      .insert(empresas)
      .values({ nombre: "Acme", prefijo: "ACM", telefono: "9999-9999" })
      .returning();
    expect(empresa.telefono).toBe("9999-9999");

    const [lote] = await t.db
      .insert(lotes)
      .values({
        empresaId: empresa.id,
        descripcion: "Boletos promoción",
        cantidad: 10,
        fechaVencimiento: "2026-12-31",
      })
      .returning();
    expect(lote.anuladoEn).toBeNull();
    expect(lote.anuladoMotivo).toBeNull();
    expect(lote.anuladoPor).toBeNull();

    await t.db.insert(loteSedes).values(
      sedeFilas.map((s) => ({ loteId: lote.id, sedeId: s.id }))
    );
    const loteSedeFilas = await t.db
      .select()
      .from(loteSedes)
      .where(eq(loteSedes.loteId, lote.id));
    expect(loteSedeFilas).toHaveLength(2);
    expect(loteSedeFilas.map((f) => f.sedeId).sort()).toEqual(
      sedeFilas.map((s) => s.id).sort()
    );
  });
});
