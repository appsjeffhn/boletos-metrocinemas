import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "tertiary" | "gold" | "danger";
type Size = "sm" | "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

const SIZE: Record<Size, string> = { sm: "btn-sm", md: "", lg: "btn-lg" };

export function Button({ variant = "primary", size = "md", className = "", ...rest }: Props) {
  return <button {...rest} className={`btn btn-${variant} ${SIZE[size]} ${className}`.trim()} />;
}
