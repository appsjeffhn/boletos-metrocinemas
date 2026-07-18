/** true si el error es una violación de restricción única de Postgres (SQLSTATE 23505). */
export function esViolacionUnica(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string }; message?: string };
  return e?.code === "23505"
    || e?.cause?.code === "23505"
    || /duplicate key|unique constraint/i.test(e?.message ?? "");
}
