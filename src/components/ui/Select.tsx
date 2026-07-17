import type { SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & { label?: string };

export function Select({ label, className = "", children, ...rest }: Props) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="font-semibold text-[var(--black-100)]">{label}</span>}
      <select {...rest} className={`input ${className}`}>
        {children}
      </select>
    </label>
  );
}
