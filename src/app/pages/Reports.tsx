import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { PosSale } from "@/features/pos";
import { filterSalesByType, summarizePosSales } from "@/features/pos";
import { getGymPosService } from "../config/gymPosService";
import {
  exportPeriodSummaryReport,
  exportProductSalesReport,
  exportSubscriptionSalesReport,
  exportTopProductsReport,
} from "../lib/exportPosReport";
import { computeTopProducts } from "../lib/platformStats";
import {
  localDateIso,
  MEMBERSHIP_CONCEPT,
  PAYMENT_METHOD,
  startOfMonthIso,
} from "../lib/labels";

type TabId = "products" | "subscriptions";

function formatMoney(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function ExportTableButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="bg-[#131313] border border-[rgba(93,63,60,0.25)] text-[#e5e2e1] hover:border-[#e31e24] disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-[9px] font-bold uppercase tracking-wide inline-flex items-center gap-1.5 transition-colors shrink-0"
    >
      <Download size={12} />
      Excel
    </button>
  );
}

export default function Reports() {
  const [tab, setTab] = useState<TabId>("products");
  const [dateFrom, setDateFrom] = useState(() => startOfMonthIso());
  const [dateTo, setDateTo] = useState(() => localDateIso());
  const [loading, setLoading] = useState(true);
  const [productSales, setProductSales] = useState<PosSale[]>([]);
  const [subscriptionSales, setSubscriptionSales] = useState<PosSale[]>([]);

  const range = useMemo(() => {
    const from = dateFrom <= dateTo ? dateFrom : dateTo;
    const to = dateFrom <= dateTo ? dateTo : dateFrom;
    return { from, to };
  }, [dateFrom, dateTo]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    const service = getGymPosService();
    try {
      const allSales = await service.listSales({ from: range.from, to: range.to });
      setProductSales(filterSalesByType(allSales, "product"));
      setSubscriptionSales(filterSalesByType(allSales, "subscription"));
    } catch (error) {
      setProductSales([]);
      setSubscriptionSales([]);
      toast.error("No se pudieron cargar los reportes del POS", {
        description: error instanceof Error ? error.message : "Error de conexión",
      });
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const productBucket = useMemo(
    () => summarizePosSales(productSales),
    [productSales],
  );
  const subscriptionBucket = useMemo(
    () => summarizePosSales(subscriptionSales),
    [subscriptionSales],
  );

  const topProducts = useMemo(
    () => computeTopProducts(5, range.from, range.to, productSales),
    [range.from, range.to, productSales],
  );

  const activeBucket = tab === "products" ? productBucket : subscriptionBucket;
  const activeList = tab === "products" ? productSales : subscriptionSales;

  const setTodayRange = () => {
    const today = localDateIso(new Date());
    setDateFrom(today);
    setDateTo(today);
  };

  const handleExportProducts = () => {
    if (productSales.length === 0) {
      toast.info("No hay ventas de productos para exportar en este periodo.");
      return;
    }
    exportProductSalesReport(productSales, productBucket, range.from, range.to);
    toast.success("Reporte de productos exportado.");
  };

  const handleExportSubscriptions = () => {
    if (subscriptionSales.length === 0) {
      toast.info("No hay suscripciones para exportar en este periodo.");
      return;
    }
    exportSubscriptionSalesReport(
      subscriptionSales,
      subscriptionBucket,
      range.from,
      range.to,
    );
    toast.success("Reporte de suscripciones exportado.");
  };

  const handleExportTopProducts = () => {
    if (topProducts.length === 0) {
      toast.info("No hay productos vendidos para exportar en este periodo.");
      return;
    }
    exportTopProductsReport(topProducts, range.from, range.to);
    toast.success("Ranking de productos exportado.");
  };

  const handleExportSummary = () => {
    const bucket = tab === "products" ? productBucket : subscriptionBucket;
    if (bucket.count === 0) {
      toast.info("No hay datos de resumen para exportar en este periodo.");
      return;
    }
    exportPeriodSummaryReport(bucket, range.from, range.to, tab);
    toast.success("Resumen del periodo exportado.");
  };

  return (
    <div className="h-full bg-[#131313] p-4 md:p-6 overflow-auto">
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-3 mb-3 md:mb-4">
        <div>
          <h1 className="text-[#e5e2e1] text-[22px] md:text-[30px] font-black tracking-[-0.5px] uppercase leading-tight">
            Reportes
          </h1>
          <p className="text-[#808080] text-[11px] mt-1 max-w-2xl">
            Ventas de productos y cobros de suscripciones.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadReports()}
          disabled={loading}
          className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-6 py-3 text-[10px] font-bold tracking-[1px] uppercase hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 inline-flex items-center gap-2 shrink-0"
        >
          {loading ? <Loader2 className="animate-spin" size={14} /> : null}
          Actualizar
        </button>
      </div>

      <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4 md:p-5 mb-4 flex flex-col sm:flex-row flex-wrap gap-4 items-end">
        <button
          type="button"
          onClick={setTodayRange}
          className="bg-[#e31e24] text-white px-5 py-2.5 text-[10px] font-bold tracking-[1px] uppercase hover:bg-[#c91920] transition-colors shrink-0"
        >
          Hoy
        </button>
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

      <div className="flex gap-2 mb-4 border-b border-[rgba(93,63,60,0.2)] pb-1">
        {(
          [
            { id: "products" as const, label: "Productos" },
            { id: "subscriptions" as const, label: "Suscripciones" },
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
            {!loading && (
              <span className="ml-2 opacity-80 tabular-nums">
                ({t.id === "products" ? productBucket.count : subscriptionBucket.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 flex flex-col items-center gap-3 text-[#808080]">
          <Loader2 className="animate-spin text-[#e31e24]" size={28} />
          <p className="text-[13px]">Cargando transacciones…</p>
        </div>
      ) : (
        <>
          <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4 md:p-5 mb-3">
            <p className="text-[#393939] text-[10px] font-bold tracking-[0.8px] uppercase mb-1">
              {tab === "products" ? "Ingresos por productos" : "Ingresos por suscripciones"} · Periodo
            </p>
            <p className="text-[#e5e2e1] text-[24px] md:text-[28px] font-black tracking-[-1px] leading-tight mb-0.5">
              ${formatMoney(activeBucket.total)}
            </p>
            <p className="text-[#808080] text-[10px]">
              {activeBucket.count} transacciones en el rango
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4 md:p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-[#e31e24] text-[9px] font-bold tracking-[1.5px] uppercase">
                  {tab === "products" ? "Detalle de ventas" : "Detalle de suscripciones"}
                </p>
                <ExportTableButton
                  onClick={tab === "products" ? handleExportProducts : handleExportSubscriptions}
                  disabled={activeList.length === 0}
                />
              </div>
              <div className="space-y-3 max-h-[480px] overflow-auto">
                {activeList.length === 0 ? (
                  <p className="text-[#808080] text-[13px]">Sin movimientos en este periodo.</p>
                ) : (
                  activeList.map((s) => (
                    <div key={s.id} className="border-b border-[rgba(93,63,60,0.06)] pb-3 text-[12px]">
                      <div className="flex justify-between gap-2">
                        <span className="text-[#e5e2e1] font-bold">${s.total.toFixed(2)}</span>
                        <span className="text-[#808080] text-[10px]">
                          {PAYMENT_METHOD[s.method] ?? s.method}
                        </span>
                      </div>
                      <p className="text-[#808080] text-[11px] mt-1">{s.linesSummary}</p>
                      {tab === "subscriptions" && s.subscriptionConcept && (
                        <p className="text-[#5a5a5a] text-[10px] mt-1">
                          {MEMBERSHIP_CONCEPT[s.subscriptionConcept] ?? s.subscriptionConcept}
                          {s.periodKey ? ` · ${s.periodKey}` : ""}
                        </p>
                      )}
                      {s.memberName && (
                        <p className="text-[#393939] text-[10px] mt-1 font-mono">
                          {s.memberName} ({s.memberId})
                        </p>
                      )}
                      <p className="text-[#393939] text-[9px] font-mono mt-1">
                        {s.id} ·{" "}
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

            {tab === "products" ? (
              <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4 md:p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-[#e31e24] text-[9px] font-bold tracking-[1.5px] uppercase">
                    Productos más vendidos
                  </p>
                  <ExportTableButton
                    onClick={handleExportTopProducts}
                    disabled={topProducts.length === 0}
                  />
                </div>
                <div className="space-y-4">
                  {topProducts.length === 0 ? (
                    <p className="text-[#808080] text-[13px]">Sin ventas registradas en el periodo.</p>
                  ) : (
                    topProducts.map((product, i) => (
                      <div key={product.name} className="border-b border-[rgba(93,63,60,0.05)] pb-3">
                        <div className="flex justify-between mb-1">
                          <span className="text-[#e5e2e1] text-[12px] font-bold">{product.name}</span>
                          <span className="text-[#e31e24] text-[12px] font-bold">
                            ${formatMoney(product.sales)}
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
            ) : (
              <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4 md:p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-[#e31e24] text-[9px] font-bold tracking-[1.5px] uppercase">
                    Resumen del periodo
                  </p>
                  <ExportTableButton
                    onClick={handleExportSummary}
                    disabled={subscriptionBucket.count === 0}
                  />
                </div>
                <div className="space-y-4 text-[12px]">
                  <div className="flex justify-between border-b border-[rgba(93,63,60,0.08)] pb-3">
                    <span className="text-[#808080]">Transacciones</span>
                    <span className="text-[#e5e2e1] font-bold tabular-nums">
                      {subscriptionBucket.count}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[rgba(93,63,60,0.08)] pb-3">
                    <span className="text-[#808080]">Subtotal</span>
                    <span className="text-[#e5e2e1] font-bold tabular-nums">
                      ${formatMoney(subscriptionBucket.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[rgba(93,63,60,0.08)] pb-3">
                    <span className="text-[#808080]">Total cobrado</span>
                    <span className="text-[#e31e24] font-bold tabular-nums">
                      ${formatMoney(subscriptionBucket.total)}
                    </span>
                  </div>
                  <p className="text-[#5a5a5a] text-[10px] leading-relaxed pt-2">
                    Las suscripciones se registran vía{" "}
                    <span className="font-mono text-[#808080]">POST /sales/subscription</span> al dar de alta o
                    renovar un miembro.
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
