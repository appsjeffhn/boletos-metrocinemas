import Image from "next/image";
import type { ReactNode } from "react";

export function BrandHeader({ right }: { right?: ReactNode }) {
  return (
    <header style={{ background: "var(--coral-100)" }} className="text-white">
      <div className="max-w-3xl mx-auto flex items-center justify-between px-4 h-16">
        <Image src="/logo.png" alt="Metrocinemas" width={132} height={36} priority style={{ height: 32, width: "auto" }} />
        {right}
      </div>
    </header>
  );
}
