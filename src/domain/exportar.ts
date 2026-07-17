type Fila = {
  codigo: string; empresa: string; sede: string | null;
  portadorNombre: string | null; portadorDni: string | null; fecha: Date | null;
};

function esc(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function aCsv(filas: Fila[]): string {
  const cols = ["codigo", "empresa", "sede", "portadorNombre", "portadorDni", "fecha"];
  const head = cols.join(",");
  const body = filas.map((f) => [
    f.codigo, f.empresa, f.sede ?? "", f.portadorNombre ?? "", f.portadorDni ?? "",
    f.fecha ? f.fecha.toISOString() : "",
  ].map((x) => esc(String(x))).join(",")).join("\n");
  return `${head}\n${body}\n`;
}
