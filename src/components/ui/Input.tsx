import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ label, error, className = "", id, ...rest }: Props) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="font-semibold text-[var(--black-100)]">{label}</span>}
      <input id={id} {...rest} className={`input ${className}`} />
      {error && <span className="text-[var(--error-150)] text-xs">{error}</span>}
    </label>
  );
}
