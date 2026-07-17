import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  tone = "brand",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "brand" | "success" | "warning" | "error" | "info";
}) {
  const accent = `var(--${tone === "brand" ? "blue" : tone}-${tone === "brand" ? "100" : "150"})`;
  return (
    <div className="card p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--black-60)]">{label}</p>
      <p className="mt-1 text-3xl font-medium" style={{ color: accent }}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-[var(--black-60)]">{hint}</p>}
    </div>
  );
}
