import { useMemo, useState } from "react";
import {
  getAccessLog,
  getMembershipIncomeTotal,
  getMembershipPayments,
} from "../lib/demoStore";
import {
  computeTopProducts,
  getActiveMembersCountFromStore,
  getPosSalesTodaySync,
} from "../lib/platformStats";

type TabId = "gym" | "pos";

export default function Reports() {
  const [tab, setTab] = useState<TabId>("gym");
  const [tick, setTick] = useState(0);

  const accessLog = useMemo(() => {
    void tick;
    return getAccessLog();
  }, [tick]);

  const membershipPayments = useMemo(() => {
    void tick;
    return getMembershipPayments();
  }, [tick]);

  const posToday = useMemo(() => {
    void tick;
    return getPosSalesTodaySync();
  }, [tick]);

  const activeMembers = useMemo(() => {
    void tick;
    return getActiveMembersCountFromStore();
  }, [tick]);

  const topProducts = useMemo(() => {
    void tick;
    return computeTopProducts();
  }, [tick]);

  const posTodayTotal = posToday.reduce((a, s) => a + s.total, 0);
  const membershipTotal = useMemo(() => {
    void tick;
    return getMembershipIncomeTotal();
  }, [tick]);

  const accessToday = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return accessLog.filter((e) => new Date(e.timestampIso) >= start);
  }, [accessLog]);

  return (
    <div className="h-full bg-[#131313] p-4 md:p-8 overflow-auto">
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-[#e5e2e1] text-[36px] md:text-[72px] font-black tracking-[-2px] md:tracking-[-3.6px] uppercase leading-tight md:leading-[72px]">
            Reports
          </h1>
          <p className="text-[#808080] text-[12px] mt-3 max-w-2xl">
            Membresías, accesos y ventas POS se leen de los datos guardados en este navegador; se actualizan al registrar
            pagos, simular accesos o cerrar ventas en POS.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setTick((t) => t + 1)}
            className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-6 py-3 text-[10px] font-bold tracking-[1px] uppercase hover:bg-[#1a1a1a] transition-colors"
          >
            Refresh_Data
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-[rgba(93,63,60,0.2)] pb-1">
        {(
          [
            { id: "gym" as const, label: "Core operativo" },
            { id: "pos" as const, label: "Punto de venta" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-[10px] font-bold uppercase tracking-wide transition-colors ${
              tab === t.id
                ? "bg-[#e31e24] text-white"
                : "bg-transparent text-[#808080] hover:text-[#e5e2e1]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "gym" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-6">
              <p className="text-[#393939] text-[11px] font-bold tracking-[1.2px] uppercase mb-2">
                Ingresos por membresías
              </p>
              <p className="text-[#e5e2e1] text-[40px] font-black tracking-tight leading-none">
                ${membershipTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[#808080] text-[10px] mt-2">{membershipPayments.length} movimientos registrados</p>
            </div>
            <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-6">
              <p className="text-[#393939] text-[11px] font-bold tracking-[1.2px] uppercase mb-2">
                Clientes activos
              </p>
              <p className="text-[#e5e2e1] text-[40px] font-black tracking-tight leading-none">
                {activeMembers.toLocaleString("en-US")}
              </p>
              <p className="text-[#808080] text-[10px] mt-2">Socios con membresía vigente hoy</p>
            </div>
            <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-6">
              <p className="text-[#393939] text-[11px] font-bold tracking-[1.2px] uppercase mb-2">
                Accesos hoy
              </p>
              <p className="text-[#e5e2e1] text-[40px] font-black tracking-tight leading-none">{accessToday.length}</p>
              <p className="text-[#808080] text-[10px] mt-2">Eventos con timestamp de hoy en el log local</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-6">
              <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-4">
                Últimos pagos de membresía
              </p>
              <div className="space-y-3 max-h-[320px] overflow-auto">
                {membershipPayments.slice(0, 12).map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between gap-3 border-b border-[rgba(93,63,60,0.06)] pb-2 text-[11px]"
                  >
                    <div>
                      <span className="text-[#e5e2e1] font-mono">{p.memberId}</span>
                      <span className="text-[#808080] block text-[10px]">
                        {p.concept} · {p.method}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[#e31e24] font-bold">${p.amount.toFixed(2)}</span>
                      <span className="text-[#393939] block text-[9px] font-mono">
                        {new Date(p.dateIso).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-6">
              <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-4">
                Log de accesos (FaceID + torniquete)
              </p>
              <div className="space-y-2 max-h-[320px] overflow-auto">
                {accessLog.slice(0, 15).map((e) => (
                  <div
                    key={e.id}
                    className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-[rgba(93,63,60,0.05)] text-[11px]"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`font-bold uppercase text-[10px] ${
                          e.result === "GRANTED" ? "text-[#00ff00]" : "text-[#e31e24]"
                        }`}
                      >
                        {e.result}
                      </span>
                      <span className="text-[#e5e2e1] font-bold">{e.memberName}</span>
                      <span className="text-[#808080] text-[10px]">{e.tier}</span>
                    </div>
                    <span className="text-[#393939] font-mono text-[10px] text-right">
                      {new Date(e.timestampIso).toLocaleString("es-MX", {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })}{" "}
                      · {e.terminalId}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "pos" && (
        <>
          <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-8 mb-6">
            <p className="text-[#393939] text-[12px] font-bold tracking-[1.2px] uppercase mb-2">
              Ventas POS · Hoy
            </p>
            <p className="text-[#e5e2e1] text-[56px] md:text-[60px] font-black tracking-[-3px] leading-[56px] mb-2">
              ${posTodayTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[#808080] text-[10px]">{posToday.length} transacciones · ventas guardadas en este navegador</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-6">
              <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-4">
                Detalle del día
              </p>
              <div className="space-y-3">
                {posToday.length === 0 ? (
                  <p className="text-[#808080] text-[13px]">Sin ventas hoy aún.</p>
                ) : (
                  posToday.map((s) => (
                    <div key={s.id} className="border-b border-[rgba(93,63,60,0.06)] pb-3 text-[12px]">
                      <div className="flex justify-between gap-2">
                        <span className="text-[#e5e2e1] font-bold">${s.total.toFixed(2)}</span>
                        <span className="text-[#808080] text-[10px]">{s.method}</span>
                      </div>
                      <p className="text-[#808080] text-[11px] mt-1">{s.linesSummary}</p>
                      {s.memberName && (
                        <p className="text-[#393939] text-[10px] mt-1 font-mono">
                          {s.memberName} ({s.memberId})
                        </p>
                      )}
                      <p className="text-[#393939] text-[9px] font-mono mt-1">
                        {new Date(s.dateIso).toLocaleTimeString("es-MX")}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-6">
              <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-4">
                Productos más vendidos
              </p>
              <div className="space-y-4">
                {topProducts.length === 0 ? (
                  <p className="text-[#808080] text-[13px]">Sin ventas registradas aún.</p>
                ) : (
                  topProducts.map((product, i) => (
                    <div key={product.name} className="border-b border-[rgba(93,63,60,0.05)] pb-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-[#e5e2e1] text-[12px] font-bold">{product.name}</span>
                        <span className="text-[#e31e24] text-[12px] font-bold">
                          ${product.sales.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#808080] text-[10px]">{product.units} unidades</span>
                        <span className="text-[#808080] text-[10px]">#{i + 1}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-6">
            <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-2">
              Notas MVP
            </p>
            <p className="text-[#808080] text-[12px] leading-relaxed max-w-3xl">
              Métodos de pago (efectivo, tarjeta, QR) y tickets se muestran en el flujo del POS. El ranking de productos se
              calcula a partir del detalle de líneas guardado en cada venta local.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
