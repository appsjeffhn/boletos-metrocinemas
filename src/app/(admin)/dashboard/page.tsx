import { db } from "@/db/client";
import { dashboardKpis } from "@/domain/dashboard";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Table, Th, Td } from "@/components/ui/Table";

export default async function DashboardPage() {
  const kpis = await dashboardKpis(db);

  const maxCanjesSede = Math.max(1, ...kpis.canjesPorSede.map((s) => s.canjeados));

  return (
    <section className="space-y-6">
      <h1 className="text-[28px] leading-8">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        <StatCard label="Empresas" value={kpis.empresas} />
        <StatCard label="Lotes activos" value={kpis.lotesActivos} />
        <StatCard label="Emitidos" value={kpis.boletosEmitidos} />
        <StatCard label="Canjeados" value={kpis.boletosCanjeados} tone="success" />
        <StatCard label="Pendientes" value={kpis.boletosPendientes} tone="warning" />
        <StatCard label="Anulados" value={kpis.boletosAnulados} tone="error" />
        <StatCard label="Canjes hoy" value={kpis.canjesHoy} tone="brand" />
      </div>

      <Card>
        <h2 className="text-base font-semibold mb-4">Canjes por sede</h2>
        {kpis.canjesPorSede.length === 0 ? (
          <p className="text-sm text-[var(--black-60)]">Sin canjes aún</p>
        ) : (
          <div className="space-y-3">
            {kpis.canjesPorSede.map((s) => (
              <div key={s.sede} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-sm">{s.sede}</span>
                <div className="flex-1 h-3 rounded-full bg-[var(--black-10)] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(s.canjeados / maxCanjesSede) * 100}%`,
                      background: "var(--blue-100)",
                    }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-sm font-semibold">{s.canjeados}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-0">
        <h2 className="text-base font-semibold p-5 pb-0">Clientes activos</h2>
        {kpis.clientesActivos.length === 0 ? (
          <p className="text-sm text-[var(--black-60)] p-5">Sin clientes con boletos activos</p>
        ) : (
          <div className="p-5">
            <Table>
              <thead>
                <tr>
                  <Th>Cliente</Th>
                  <Th>Pendientes</Th>
                  <Th>Canjeados</Th>
                  <Th>Progreso</Th>
                </tr>
              </thead>
              <tbody>
                {kpis.clientesActivos.map((c) => {
                  const total = c.pendientes + c.canjeados;
                  const pct = total > 0 ? (c.canjeados / total) * 100 : 0;
                  return (
                    <tr key={c.empresa}>
                      <Td>{c.empresa}</Td>
                      <Td>{c.pendientes}</Td>
                      <Td>{c.canjeados}</Td>
                      <Td>
                        <div className="flex items-center gap-2 min-w-[8rem]">
                          <div className="flex-1 h-3 rounded-full bg-[var(--black-10)] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, background: "var(--blue-100)" }}
                            />
                          </div>
                          <span className="w-10 shrink-0 text-right text-xs text-[var(--black-60)]">
                            {Math.round(pct)}%
                          </span>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      <Card className="p-0">
        <h2 className="text-base font-semibold p-5 pb-0">Últimos canjes</h2>
        {kpis.ultimosCanjes.length === 0 ? (
          <p className="text-sm text-[var(--black-60)] p-5">Sin canjes aún</p>
        ) : (
          <div className="p-5">
            <Table>
              <thead>
                <tr>
                  <Th>Código</Th>
                  <Th>Empresa</Th>
                  <Th>Sede</Th>
                  <Th>Portador</Th>
                  <Th>Fecha</Th>
                </tr>
              </thead>
              <tbody>
                {kpis.ultimosCanjes.map((c) => (
                  <tr key={c.codigo}>
                    <Td>{c.codigo}</Td>
                    <Td>{c.empresa}</Td>
                    <Td>{c.sede ?? "—"}</Td>
                    <Td>{c.portadorNombre ?? "—"}</Td>
                    <Td>{c.fecha ? c.fecha.toLocaleString("es-HN") : "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>
    </section>
  );
}
