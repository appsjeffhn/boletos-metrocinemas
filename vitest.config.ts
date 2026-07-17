import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
    // PGlite crea una instancia Postgres en memoria por archivo; correrlos en
    // paralelo en Windows causa contención y timeouts transitorios. Serializar
    // los archivos hace la suite fiable (a costa de algo de velocidad).
    fileParallelism: false,
    testTimeout: 20000,
  },
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
});
