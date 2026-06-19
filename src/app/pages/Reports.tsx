import { useMemo, useState } from "react";
import {
  getAccessLogInRange,
  getMembershipIncomeInRange,
  getMembershipPaymentsInRange,
} from "../lib/demoStore";
import {
  ACCESS_RESULT,
  MEMBERSHIP_CONCEPT,
  PAYMENT_METHOD,
  startOfMonthIso,
  todayIso,
} from "../lib/labels";
import {
  computeTopProducts,
  getActiveMembersCountFromStore,
  getPosSalesInRange,
} from "../lib/platformStats";

type TabId = "gym" | "pos";

export default function Reports() {
  const [tab, setTab] = useState<TabId>("gym");
  const [dateFrom, setDateFrom] = useState(startOfMonthIso);
  const [dateTo, setDateTo] = useState(todayIso);
  const [tick, setTick] = useState(0);

  const range = useMemo(() => {
    void tick;
    const from = dateFrom <= dateTo ? dateFrom : dateTo;
    const to = dateFrom <= dateTo ? dateTo : dateFrom;
    return { from, to };
  }, [dateFrom, dateTo, tick]);

  const membershipPayments = useMemo(
    () => getMembershipPaymentsInRange(range.from, range.to),
    [range, tick],
  );

  const accessLog = useMemo(
    () => getAccessLogInRange(range.from, range.to),
    [range, tick],
  );

  const posSales = useMemo(
    () => getPosSalesInRange(range.from, range.to),
    [range, tick],
  );

  const activeMembers = useMemo(() => getActiveMembersCountFromStore(), [tick]);

  const topProducts = useMemo(
    () => computeTopProducts(5, range.from, range.to),
    [range, tick],
  );

  const membershipTotal = useMemo(
    () => getMembershipIncomeInRange(range.from, range.to),
    [range, tick],
  );

  const posTotal = posSales.reduce((a, s) => a + s.total, 0);
  const accessGranted = accessLog.filter((e) => e.result === "GRANTED").length;

  return (
    <div className="h-full bg-[#131313] p-4 md:p-8 overflow-auto">
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-[#e5e2e1] text-[36px] md:text-[72px] font-black tracking-[-2px] md:tracking-[-3.6px] uppercase leading-tight md:leading-[72px]">
            Reportes
          </h1>
          <p className="text-[#808080] text-[12px] mt-3 max-w-2xl">
            Membresías, accesos y ventas de la tienda según el rango de fechas seleccionado.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTick((t) => t + 1)}
          className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-6 py-3 text-[10px] font-bold tracking-[1px] uppercase hover:bg-[#1a1a1a] transition-colors"
        >
          Actualizar
        </button>
      </div>

      <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4 md:p-6 mb-6 flex flex-col sm:flex-row flex-wrap gap-4 items-end">
        <div>
          <label className="text-[#808080] text-[10px] font-bold uppercase tracking-wide block mb-1.5">
            Desde
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-[#131313] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-2.5 focus:border-[#e31e24] focus:outline-none [color-scheme:dark]"
          />
        </div>
        <div>
          <label className="text-[#808080] text-[10px] font-bold uppercase tracking-wide block mb-1.5">
            Hasta
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-[#131313] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-2.5 focus:border-[#e31e24] focus:outline-none [color-scheme:dark]"
          />
        </div>
        <p className="text-[#393939] text-[11px] sm:ml-auto">
          Periodo: {range.from} — {range.to}
        </p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-[rgba(93,63,60,0.2)] pb-1">
        {(
          [
            { id: "gym" as const, label: "Operación del gym" },
            { id: "pos" as const, label: "Tienda" },
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
              <p className="text-[#808080] text-[10px] mt-2">{membershipPayments.length} movimientos en el periodo</p>
            </div>
            <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-6">
              <p className="text-[#393939] text-[11px] font-bold tracking-[1.2px] uppercase mb-2">
                Clientes activos
              </p>
              <p className="text-[#e5e2e1] text-[40px] font-black tracking-tight leading-none">
                {activeMembers.toLocaleString("es-MX")}
              </p>
              <p className="text-[#808080] text-[10px] mt-2">Miembros con membresía vigente hoy</p>
            </div>
            <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-6">
              <p className="text-[#393939] text-[11px] font-bold tracking-[1.2px] uppercase mb-2">
                Accesos en el periodo
              </p>
              <p className="text-[#e5e2e1] text-[40px] font-black tracking-tight leading-none">{accessGranted}</p>
              <p className="text-[#808080] text-[10px] mt-2">Accesos permitidos en el rango</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-6">
              <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-4">
                Pagos de membresía
              </p>
              <div className="space-y-3 max-h-[320px] overflow-auto">
                {membershipPayments.length === 0 ? (
                  <p className="text-[#808080] text-[12px]">Sin pagos en este periodo.</p>
                ) : (
                  membershipPayments.slice(0, 12).map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between gap-3 border-b border-[rgba(93,63,60,0.06)] pb-2 text-[11px]"
                    >
                      <div>
                        <span className="text-[#e5e2e1] font-mono">{p.memberId}</span>
                        <span className="text-[#808080] block text-[10px]">
                          {MEMBERSHIP_CONCEPT[p.concept] ?? p.concept} ·{" "}
                          {PAYMENT_METHOD[p.method] ?? p.method}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#e31e24] font-bold">${p.amount.toFixed(2)}</span>
                        <span className="text-[#393939] block text-[9px] font-mono">
                          {new Date(p.dateIso).toLocaleString("es-MX", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-6">
              <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-4">
                Log de accesos
              </p>
              <div className="space-y-2 max-h-[320px] overflow-auto">
                {accessLog.length === 0 ? (
                  <p className="text-[#808080] text-[12px]">Sin accesos en este periodo.</p>
                ) : (
                  accessLog.slice(0, 15).map((e) => (
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
                          {ACCESS_RESULT[e.result] ?? e.result}
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
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "pos" && (
        <>
          <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-8 mb-6">
            <p className="text-[#393939] text-[12px] font-bold tracking-[1.2px] uppercase mb-2">
              Ventas de tienda · Periodo
            </p>
            <p className="text-[#e5e2e1] text-[56px] md:text-[60px] font-black tracking-[-3px] leading-[56px] mb-2">
              ${posTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[#808080] text-[10px]">{posSales.length} transacciones en el rango</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-6">
              <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-4">
                Detalle de ventas
              </p>
              <div className="space-y-3">
                {posSales.length === 0 ? (
                  <p className="text-[#808080] text-[13px]">Sin ventas en este periodo.</p>
                ) : (
                  posSales.map((s) => (
                    <div key={s.id} className="border-b border-[rgba(93,63,60,0.06)] pb-3 text-[12px]">
                      <div className="flex justify-between gap-2">
                        <span className="text-[#e5e2e1] font-bold">${s.total.toFixed(2)}</span>
                        <span className="text-[#808080] text-[10px]">
                          {PAYMENT_METHOD[s.method] ?? s.method}
                        </span>
                      </div>
                      <p className="text-[#808080] text-[11px] mt-1">{s.linesSummary}</p>
                      {s.memberName && (
                        <p className="text-[#393939] text-[10px] mt-1 font-mono">
                          {s.memberName} ({s.memberId})
                        </p>
                      )}
                      <p className="text-[#393939] text-[9px] font-mono mt-1">
                        {new Date(s.dateIso).toLocaleString("es-MX", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
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
                  <p className="text-[#808080] text-[13px]">Sin ventas registradas en el periodo.</p>
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
        </>
      )}
    </div>
  );
}
