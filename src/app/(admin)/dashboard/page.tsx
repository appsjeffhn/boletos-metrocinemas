import Link from "next/link";
import { db } from "@/db/client";
import { dashboardKpis } from "@/domain/dashboard";
import { resumenProductos } from "@/domain/reportesProductos";
import s from "./dashboard.module.css";

function money(n: number): string {
  return "L." + Math.round(n).toLocaleString("es-HN");
}

export default async function DashboardPage() {
  const [kpis, resumen] = await Promise.all([dashboardKpis(db), resumenProductos(db, {})]);

  const valOtorgado = resumen.reduce((a, r) => a + r.montoCreado, 0);
  const valCanjeado = resumen.reduce((a, r) => a + r.montoCanjeado, 0);
  const valPendiente = resumen.reduce((a, r) => a + r.montoPendiente, 0);
  const valTotal = valCanjeado + valPendiente;
  const gPct = valTotal > 0 ? Math.round((valCanjeado / valTotal) * 100) : 0;

  const pctCanjeado = kpis.boletosEmitidos > 0
    ? Math.round((kpis.boletosCanjeados / kpis.boletosEmitidos) * 100)
    : 0;

  const sedes = [...kpis.canjesPorSede].sort((a, b) => b.canjeados - a.canjeados);
  const totalSede = sedes.reduce((a, x) => a + x.canjeados, 0);
  const maxSede = sedes[0]?.canjeados || 1;

  const ultimo = kpis.ultimosCanjes[0];

  return (
    <section className="space-y-5">
      <h1>Dashboard</h1>

      <div className={s.bento}>
        {/* HERO */}
        <div className={`${s.tile} ${s.hero} ${s.c2} ${s.r2}`}>
          <div>
            <div className={s.heroK}>Canjes hoy</div>
            <div className={s.heroBig}>{kpis.canjesHoy.toLocaleString("es-HN")}</div>
            <div className={s.heroCap}>
              {kpis.boletosCanjeados.toLocaleString("es-HN")} canjeados de {kpis.boletosEmitidos.toLocaleString("es-HN")} emitidos
            </div>
          </div>
          <div>
            <div className={s.heroBarLbl}>{pctCanjeado}% de los boletos canjeados</div>
            <div className={s.heroTrack}><div className={s.heroFill} style={{ width: `${pctCanjeado}%` }} /></div>
          </div>
        </div>

        {/* KPIs */}
        <div className={`${s.tile} ${s.kpi}`}><div className={s.lbl}>Empresas</div><div className={s.num}>{kpis.empresas}</div></div>
        <div className={`${s.tile} ${s.kpi} ${s.kpiGold}`}><div className={s.lbl}>Lotes activos</div><div className={s.num}>{kpis.lotesActivos}</div></div>
        <div className={`${s.tile} ${s.kpi}`}><div className={s.lbl}>Canjeados</div><div className={s.num}>{kpis.boletosCanjeados.toLocaleString("es-HN")}</div></div>
        <div className={`${s.tile} ${s.kpi} ${s.kpiGold}`}><div className={s.lbl}>Pendientes</div><div className={s.num}>{kpis.boletosPendientes.toLocaleString("es-HN")}</div></div>

        {/* VALORES */}
        <div className={`${s.tile} ${s.c2}`}>
          <div className={s.lbl}>Valor de items</div>
          <div className={s.values}>
            <div><div className={s.lbl}>Otorgado</div><div className={s.money}>{money(valOtorgado)}</div></div>
            <div><div className={s.lbl}>Canjeado</div><div className={`${s.money} ${s.moneyOk}`}>{money(valCanjeado)}</div></div>
            <div><div className={s.lbl}>Pendiente</div><div className={`${s.money} ${s.moneyWn}`}>{money(valPendiente)}</div></div>
          </div>
          <div className={s.prop}>
            <span className={s.propG} style={{ width: `${gPct}%` }} />
            <span className={s.propA} style={{ width: `${100 - gPct}%` }} />
          </div>
          <div className={s.plegend}>
            <span><i style={{ background: "var(--success-150)" }} />Canjeado {gPct}%</span>
            <span><i style={{ background: "var(--warning-100)" }} />Pendiente {100 - gPct}%</span>
          </div>
        </div>

        {/* CANJES POR SEDE */}
        <div className={`${s.tile} ${s.c2} ${s.r2}`}>
          <div className={s.sedeHead}>
            <span className={s.lbl}>Canjes por sede</span>
            <span className={s.sedeTot}>{totalSede.toLocaleString("es-HN")} total · {sedes.length} sede{sedes.length === 1 ? "" : "s"}</span>
          </div>
          {sedes.length === 0 ? (
            <p className={s.empty}>Sin canjes aún.</p>
          ) : (
            <div className={s.rows}>
              {sedes.slice(0, 6).map((x, i) => (
                <div className={s.row} key={x.sede}>
                  <span className={`${s.rowNm} ${i === 0 ? s.rowNmLead : ""}`}>{x.sede}</span>
                  <span className={s.track}>
                    <span className={`${s.fill} ${i === 0 ? s.fillLead : ""}`} style={{ width: `${Math.round((x.canjeados / maxSede) * 100)}%` }} />
                  </span>
                  <span className={s.rowVal}>
                    {x.canjeados.toLocaleString("es-HN")}
                    <span className={s.pct}>{totalSede > 0 ? Math.round((x.canjeados / totalSede) * 100) : 0}%</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ÚLTIMO CANJE */}
        <div className={s.tile}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className={s.okBadge}>Último canje</span>
            <span className={s.ring}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          </div>
          {ultimo ? (
            <>
              <div className={s.code}>{ultimo.codigo}</div>
              <div className={s.meta}>{[ultimo.sede, ultimo.empresa].filter(Boolean).join(" · ")}</div>
            </>
          ) : (
            <p className={s.empty}>Sin canjes aún.</p>
          )}
        </div>

        {/* ANULADOS */}
        <div className={`${s.tile} ${s.errt}`}>
          <div className={s.lbl}>Anulados</div>
          <div className={s.num}>{kpis.boletosAnulados.toLocaleString("es-HN")}</div>
        </div>

        {/* ACCESOS RÁPIDOS */}
        <div className={`${s.tile} ${s.dark} ${s.c4}`}>
          <div className={s.lbl}>Accesos rápidos</div>
          <div className={s.acts}>
            <Link href="/eventos">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M3 9h18M8 4v16" stroke="currentColor" strokeWidth="1.8" /></svg>
              Eventos
            </Link>
            <Link href="/reportes">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              Reportes
            </Link>
            <Link href="/configuracion">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M18 18l-2-2M6 18l2-2M18 6l-2 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              Configuración
            </Link>
          </div>
        </div>

        {/* CLIENTES ACTIVOS */}
        <div className={`${s.tile} ${s.c4}`}>
          <span className={s.lbl}>Clientes activos</span>
          {kpis.clientesActivos.length === 0 ? (
            <p className={s.empty}>Sin clientes con boletos activos.</p>
          ) : (
            <div className={s.clientes}>
              <div className={s.chead}>Cliente</div>
              <div className={`${s.chead} ${s.r}`}>Pendientes</div>
              <div className={`${s.chead} ${s.r}`}>Canjeados</div>
              <div className={s.chead}>Progreso</div>
              {kpis.clientesActivos.map((c) => {
                const total = c.pendientes + c.canjeados;
                const pct = total > 0 ? Math.round((c.canjeados / total) * 100) : 0;
                return (
                  <div key={c.empresa} style={{ display: "contents" }}>
                    <div className={s.cname}>{c.empresa}</div>
                    <div className={s.cnum}>{c.pendientes.toLocaleString("es-HN")}</div>
                    <div className={s.cnum}>{c.canjeados.toLocaleString("es-HN")}</div>
                    <div className={s.cprog}>
                      <span className={s.track}><span className={s.fill} style={{ width: `${pct}%` }} /></span>
                      <span className={s.p}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ÚLTIMOS CANJES */}
        <div className={`${s.tile} ${s.c4}`}>
          <div className={s.listHead}>
            <span className={s.lbl}>Últimos canjes</span>
          </div>
          {kpis.ultimosCanjes.length === 0 ? (
            <p className={s.empty}>Sin canjes aún.</p>
          ) : (
            <div className={s.list}>
              {kpis.ultimosCanjes.map((c) => (
                <div className={s.li} key={c.codigo}>
                  <span className={s.liCode}>{c.codigo}</span>
                  <span className={s.liMuted}>{c.empresa}</span>
                  <span className={s.liMuted}>{c.sede ?? "—"}</span>
                  <span className={s.liDate}>{c.fecha ? new Date(c.fecha).toLocaleString("es-HN") : "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
