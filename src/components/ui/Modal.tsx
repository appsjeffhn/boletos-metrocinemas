"use client";
import type { ReactNode } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "md" | "lg";
}) {
  if (!open) return null;
  const maxW = size === "lg" ? "max-w-2xl" : "max-w-md";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(9,20,46,0.45)" }}
      onClick={onClose}
    >
      <div
        className={`card w-full ${maxW} max-h-[90vh] overflow-y-auto p-5 sm:p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="text-xl font-semibold mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
