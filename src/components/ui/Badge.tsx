import type { ReactNode } from "react";

type Tone = "success" | "warning" | "error" | "info" | "neutral" | "brand";

const TONES: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: "var(--success-10)", fg: "var(--success-150)" },
  warning: { bg: "var(--warning-10)", fg: "var(--warning-150)" },
  error: { bg: "var(--error-10)", fg: "var(--error-150)" },
  info: { bg: "var(--info-10)", fg: "var(--info-150)" },
  brand: { bg: "var(--blue-10)", fg: "var(--blue-hover)" },
  neutral: { bg: "var(--black-10)", fg: "var(--black-60)" },
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  const c = TONES[tone];
  return (
    <span
      style={{ background: c.bg, color: c.fg, borderRadius: "var(--radius-full)" }}
      className="inline-flex items-center px-2.5 py-0.5 text-xs font-bold"
    >
      {children}
    </span>
  );
}
