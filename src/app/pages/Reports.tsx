import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { PosSale } from "@/features/pos";
import {
  filterSalesByPayer,
  filterSalesByType,
  summarizePosSales,
  summarizeSalesByPayer,
} from "@/features/pos";
import { getGymPosService } from "../config/gymPosService";
import {
  exportCashierReport,
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

type TabId = "products" | "subscriptions" | "cashiers";

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

function SalePayerLine({ sale }: { sale: PosSale }) {
  if (!sale.payerName && !sale.payerId) return null;
  return (
    <p className="text-[#909090] text-[10px] mt-1">
      Atendió:{" "}
      <span className="text-[#c8c4c3] font-semibold">
        {sale.payerName ?? sale.payerId}
      </span>
      {sale.payerId && sale.payerName ? (
        <span className="font-mono text-[#707070] ml-1">({sale.payerId})</span>
      ) : null}
    </p>
  );
}

export default function Reports() {
  const [tab, setTab] = useState<TabId>("products");
  const [dateFrom, setDateFrom] = useState(() => startOfMonthIso());
  const [dateTo, setDateTo] = useState(() => localDateIso());
  const [loading, setLoading] = useState(true);
  const [allSales, setAllSales] = useState<PosSale[]>([]);
  const [payerFilter, setPayerFilter] = useState("ALL");

  const range = useMemo(() => {
    const from = dateFrom <= dateTo ? dateFrom : dateTo;
    const to = dateFrom <= dateTo ? dateTo : dateFrom;
    return { from, to };
  }, [dateFrom, dateTo]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    const service = getGymPosService();
    try {
      const sales = await service.listSales({ from: range.from, to: range.to });
      setAllSales(sales);
    } catch (error) {
      setAllSales([]);
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

  const cashierSummaries = useMemo(
    () => summarizeSalesByPayer(allSales),
    [allSales],
  );

  const payerFilterOptions = useMemo(
    () =>
      cashierSummaries.map((row) => ({
        key: row.key,
        label: row.payerName,
        id: row.payerId,
      })),
    [cashierSummaries],
  );

  useEffect(() => {
    if (
      payerFilter !== "ALL" &&
      !payerFilterOptions.some((opt) => opt.key === payerFilter)
    ) {
      setPayerFilter("ALL");
    }
  }, [payerFilter, payerFilterOptions]);

  const filteredAllSales = useMemo(
    () => filterSalesByPayer(allSales, payerFilter),
    [allSales, payerFilter],
  );

  const productSales = useMemo(
    () => filterSalesByType(filteredAllSales, "product"),
    [filteredAllSales],
  );
  const subscriptionSales = useMemo(
    () => filterSalesByType(filteredAllSales, "subscription"),
    [filteredAllSales],
  );

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

  const activeBucket =
    tab === "products"
      ? productBucket
      : tab === "subscriptions"
        ? subscriptionBucket
        : summarizePosSales(allSales);
  const activeList =
    tab === "products"
      ? productSales
      : tab === "subscriptions"
        ? subscriptionSales
        : [];

  const filteredCashierSummaries = useMemo(() => {
    if (payerFilter === "ALL") return cashierSummaries;
    return cashierSummaries.filter((row) => row.key === payerFilter);
  }, [cashierSummaries, payerFilter]);

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
    exportPeriodSummaryReport(
      bucket,
      range.from,
      range.to,
      tab === "products" ? "products" : "subscriptions",
    );
    toast.success("Resumen del periodo exportado.");
  };

  const handleExportCashiers = () => {
    if (filteredCashierSummaries.length === 0) {
      toast.info("No hay ventas por cajero en este periodo.");
      return;
    }
    exportCashierReport(filteredCashierSummaries, range.from, range.to);
    toast.success("Reporte por cajero exportado.");
  };

  const tabCounts = {
    products: productBucket.count,
    subscriptions: subscriptionBucket.count,
    cashiers: cashierSummaries.length,
  };

  return (
    <div className="h-full bg-[#131313] p-4 md:p-6 overflow-auto">
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-3 mb-3 md:mb-4">
        <div>
          <h1 className="text-[#e5e2e1] text-[22px] md:text-[30px] font-black tracking-[-0.5px] uppercase leading-tight">
            Reportes
          </h1>
          <p className="text-[#808080] text-[11px] mt-1 max-w-2xl">
            Ventas de productos, suscripciones y desempeño por cajero.
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
        <div className="min-w-[200px] flex-1 sm:max-w-xs">
          <label className="text-[#808080] text-[10px] font-bold uppercase tracking-wide block mb-1.5">
            Cajero
          </label>
          <select
            value={payerFilter}
            onChange={(e) => setPayerFilter(e.target.value)}
            className="w-full bg-[#131313] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-2.5 focus:border-[#e31e24] focus:outline-none"
          >
            <option value="ALL">Todos los cajeros</option>
            {payerFilterOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
                {opt.id ? ` (${opt.id})` : ""}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[#393939] text-[11px] sm:ml-auto">
          Periodo: {range.from} — {range.to}
        </p>
      </div>

      <div className="flex gap-2 mb-4 border-b border-[rgba(93,63,60,0.2)] pb-1 flex-wrap">
        {(
          [
            { id: "products" as const, label: "Productos" },
            { id: "subscriptions" as const, label: "Suscripciones" },
            { id: "cashiers" as const, label: "Vendedores" },
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
                ({tabCounts[t.id]})
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
      ) : tab === "cashiers" ? (
        <>
          <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4 md:p-5 mb-3">
            <p className="text-[#393939] text-[10px] font-bold tracking-[0.8px] uppercase mb-1">
              Total cobrado por vendedores · Periodo
            </p>
            <p className="text-[#e5e2e1] text-[24px] md:text-[28px] font-black tracking-[-1px] leading-tight mb-0.5">
              $
              {formatMoney(
                filteredCashierSummaries.reduce(
                  (acc, row) => acc + row.totalAmount,
                  0,
                ),
              )}
            </p>
            <p className="text-[#808080] text-[10px]">
              {filteredCashierSummaries.reduce((acc, row) => acc + row.totalCount, 0)}{" "}
              transacciones · {filteredCashierSummaries.length} cajero
              {filteredCashierSummaries.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4 md:p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-[#e31e24] text-[9px] font-bold tracking-[1.5px] uppercase">
                Ventas por cajero
              </p>
              <ExportTableButton
                onClick={handleExportCashiers}
                disabled={filteredCashierSummaries.length === 0}
              />
            </div>

            {filteredCashierSummaries.length === 0 ? (
              <p className="text-[#808080] text-[13px]">
                Sin ventas con cajero registrado en este periodo.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-[12px]">
                  <thead>
                    <tr className="text-[#808080] text-[10px] uppercase tracking-wide border-b border-[rgba(93,63,60,0.15)]">
                      <th className="text-left py-2 pr-3 font-bold">Cajero</th>
                      <th className="text-right py-2 px-2 font-bold">Productos</th>
                      <th className="text-right py-2 px-2 font-bold">Suscripciones</th>
                      <th className="text-right py-2 px-2 font-bold">Transacciones</th>
                      <th className="text-right py-2 pl-2 font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCashierSummaries.map((row) => (
                      <tr
                        key={row.key}
                        className="border-b border-[rgba(93,63,60,0.06)] text-[#e5e2e1]"
                      >
                        <td className="py-3 pr-3 align-top">
                          <p className="font-bold">{row.payerName}</p>
                          {row.payerId ? (
                            <p className="text-[#707070] text-[10px] font-mono mt-0.5">
                              {row.payerId}
                            </p>
                          ) : null}
                        </td>
                        <td className="py-3 px-2 text-right align-top tabular-nums">
                          <p>{row.productCount}</p>
                          <p className="text-[#909090] text-[10px]">
                            ${formatMoney(row.productTotal)}
                          </p>
                        </td>
                        <td className="py-3 px-2 text-right align-top tabular-nums">
                          <p>{row.subscriptionCount}</p>
                          <p className="text-[#909090] text-[10px]">
                            ${formatMoney(row.subscriptionTotal)}
                          </p>
                        </td>
                        <td className="py-3 px-2 text-right align-top tabular-nums">
                          {row.totalCount}
                        </td>
                        <td className="py-3 pl-2 text-right align-top font-bold text-[#e31e24] tabular-nums">
                          ${formatMoney(row.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
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
              {payerFilter !== "ALL" ? " · filtrado por cajero" : ""}
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
                      <p className="text-[#d8d4d3] text-[12px] mt-1 leading-snug">
                        {s.linesSummary}
                      </p>
                      {tab === "subscriptions" && s.subscriptionConcept && (
                        <p className="text-[#b8b4b3] text-[11px] mt-1">
                          {MEMBERSHIP_CONCEPT[s.subscriptionConcept] ?? s.subscriptionConcept}
                          {s.periodKey ? ` · ${s.periodKey}` : ""}
                        </p>
                      )}
                      {s.memberName && (
                        <p className="text-[#a8a4a3] text-[10px] mt-1 font-mono">
                          Cliente: {s.memberName} ({s.memberId})
                        </p>
                      )}
                      <SalePayerLine sale={s} />
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
                    Las suscripciones se registran al dar de alta o renovar un miembro. El cajero
                    queda en <span className="font-mono text-[#808080]">payerId</span> /{" "}
                    <span className="font-mono text-[#808080]">payerName</span>.
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
