import { describe, it, expect, afterEach } from "vitest";
import { createTestDb } from "@/test/db";
import { sedes } from "@/db/schema";

let close: () => Promise<void>;
afterEach(() => close?.());

describe("schema", () => {
  it("inserta y lee una sede", async () => {
    const t = await createTestDb();
    close = t.close;
    await t.db.insert(sedes).values({ nombre: "MEGAMALL" });
    const filas = await t.db.select().from(sedes);
    expect(filas).toHaveLength(1);
    expect(filas[0].nombre).toBe("MEGAMALL");
  });
});
