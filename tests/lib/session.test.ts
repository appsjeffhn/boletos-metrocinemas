import { describe, it, expect } from "vitest";
import { COOKIE_NAME } from "@/lib/session";

describe("session", () => {
  it("expone el nombre de cookie", () => {
    expect(COOKIE_NAME).toBe("sesion");
  });
});
