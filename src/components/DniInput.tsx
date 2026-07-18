"use client";
import { useEffect, useState, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/Input";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode" | "pattern"> & {
  label?: string;
};

/**
 * Campo de DNI/teléfono para taquilla. Fuerza el teclado numérico
 * (`inputMode="numeric"` + `pattern`), pensado porque el uso principal es un
 * número de teléfono. En iPhone el teclado numérico no trae tecla de retorno
 * para cerrarlo, así que mostramos un botón "Ocultar teclado" mientras el
 * campo tiene el foco (solo en iOS) que hace blur del input activo.
 */
export function DniInput({ label = "DNI del portador", onFocus, onBlur, ...rest }: Props) {
  const [isIOS, setIsIOS] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    // iPadOS 13+ se presenta como "MacIntel" con pantalla táctil.
    const ios =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(ios);
  }, []);

  return (
    <div className="flex flex-col gap-1">
      <Input
        {...rest}
        label={label}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
      />
      {isIOS && focused && (
        <button
          type="button"
          // pointerdown ocurre antes de que el foco pase al botón; con
          // preventDefault el input conserva el foco y lo cerramos con blur().
          onPointerDown={(e) => {
            e.preventDefault();
            (document.activeElement as HTMLElement | null)?.blur();
          }}
          className="self-end mt-1 inline-flex items-center gap-1 rounded-lg bg-[var(--black-10)] px-3 py-2 text-xs font-semibold text-[var(--coral-100)]"
        >
          Ocultar teclado
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
