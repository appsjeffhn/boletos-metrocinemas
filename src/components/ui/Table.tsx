import type { ReactNode, TableHTMLAttributes, TdHTMLAttributes } from "react";

export function Table({ children, ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="card ui-table overflow-x-auto p-0">
      <table {...rest} className="w-full text-sm">
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <th className={`text-left font-bold text-xs uppercase tracking-wide text-[var(--black-60)] px-4 py-3 ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = "", ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td {...rest} className={`px-4 py-3 border-t border-[var(--black-10)] ${className}`}>
      {children}
    </td>
  );
}
