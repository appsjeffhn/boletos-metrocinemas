"use client";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import styles from "./collection.module.css";

const Dots = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.7" fill="currentColor" /><circle cx="12" cy="12" r="1.7" fill="currentColor" /><circle cx="19" cy="12" r="1.7" fill="currentColor" /></svg>
);

function focusables(menu: HTMLElement | null): HTMLElement[] {
  if (!menu) return [];
  return Array.from(menu.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
}

/**
 * Menú de acciones "⋯" para filas/tarjetas de las colecciones.
 * Centraliza la accesibilidad de teclado: enfoca el primer ítem al abrir,
 * navega con flechas/Home/End, y Escape o Tab cierran devolviendo el foco al
 * botón disparador. `children` recibe `close` para cerrar tras cada acción.
 */
export function RowMenu({
  label = "Acciones",
  children,
}: {
  label?: string;
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = () => setOpen(false);
  const closeAndFocus = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (open) focusables(menuRef.current)[0]?.focus();
  }, [open]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const list = focusables(menuRef.current);
    if (list.length === 0) return;
    const idx = list.indexOf(document.activeElement as HTMLElement);
    switch (e.key) {
      case "Escape":
      case "Tab":
        e.preventDefault();
        closeAndFocus();
        break;
      case "ArrowDown":
        e.preventDefault();
        list[(idx + 1) % list.length]?.focus();
        break;
      case "ArrowUp":
        e.preventDefault();
        list[(idx - 1 + list.length) % list.length]?.focus();
        break;
      case "Home":
        e.preventDefault();
        list[0]?.focus();
        break;
      case "End":
        e.preventDefault();
        list[list.length - 1]?.focus();
        break;
    }
  }

  return (
    <div className={styles.menuWrap}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.icobtn}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Dots />
      </button>
      {open && (
        <>
          <div className={styles.backdrop} onClick={close} />
          <div ref={menuRef} className={styles.menu} role="menu" onKeyDown={onKeyDown}>
            {typeof children === "function" ? children(close) : children}
          </div>
        </>
      )}
    </div>
  );
}
