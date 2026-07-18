import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { sedes } from "@/db/schema";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("schema sedes.activo", () => {
  it("una sede nueva queda activa por defecto", async () => {
    const t = await createTestDb(); close = t.close;
    const [s] = await t.db.insert(sedes).values({ nombre: "NOVACENTRO" }).returning();
    expect(s.activo).toBe(true);
  });
});
