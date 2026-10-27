import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CreditCard, RefreshCw } from "lucide-react";
import { getPendingPayments, voidSale, type PendingSale } from "../api/pointPaymentService";

type PendingPaymentsPanelProps = {
  // Abre el CheckoutModal con la venta elegida
  onResume: (saleId: string) => void;
  // Cambiar este número fuerza a recargar la lista
  refreshKey?: number;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  REJECTED: "Rechazado",
  EXPIRED: "Expirado",
  CANCELED: "Cancelado",
};

const money = (n: number) => `$${n.toFixed(2)}`;

export function PendingPaymentsPanel({ onResume, refreshKey = 0 }: PendingPaymentsPanelProps) {
  const [sales, setSales] = useState<PendingSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPendingPayments();
      setSales(res.data ?? []);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar los cobros pendientes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const handleVoid = async (sale: PendingSale) => {
    if (!window.confirm(`¿Anular la venta ${sale.id} por ${money(sale.total)}? No se cobrará.`)) {
      return;
    }
    setBusyId(sale.id);
    try {
      await voidSale(sale.id);
    } catch (e: any) {
      window.alert(e?.message || "No se pudo anular la venta.");
    } finally {
      setBusyId(null);
      await load();
    }
  };

  // Sin pendientes ni errores: no se muestra nada
  if (!error && sales.length === 0) return null;

  return (
    <div className="mb-4 bg-[#0e0e0e] border border-[#e31e24]/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-[#e31e24]" />
          <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase">
            Cobros con tarjeta pendientes {sales.length > 0 ? `(${sales.length})` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-1 text-[#808080] hover:text-[#e5e2e1] text-[10px] font-bold uppercase tracking-[1px] disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {loading ? "Actualizando" : "Actualizar"}
        </button>
      </div>

      {error ? <p className="text-[#e31e24] text-[11px] mb-2">{error}</p> : null}

      <div className="space-y-2">
        {sales.map((sale) => {
          const inTerminal = sale.orderStatus === "PENDING" && Boolean(sale.orderId);
          const busy = busyId === sale.id;
          return (
            <div
              key={sale.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#131313] border border-[rgba(93,63,60,0.25)] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-[#e5e2e1] text-[12px] font-bold truncate">
                  <span className="tabular-nums">{money(sale.total)}</span>
                  <span className="text-[#808080] font-normal"> · {sale.linesSummary || sale.id}</span>
                </p>
                <p className="text-[#808080] text-[9px] font-mono mt-0.5">
                  {sale.id}
                  {sale.payerName ? ` · ${sale.payerName}` : ""}
                  {" · "}
                  {new Date(sale.dateIso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                  {" · "}
                  <span className={inTerminal ? "text-[#e5e2e1]" : "text-[#e31e24]"}>
                    {inTerminal ? "En terminal" : STATUS_LABEL[sale.paymentStatus] ?? sale.paymentStatus}
                  </span>
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onResume(sale.id)}
                  disabled={busy}
                  className="flex items-center gap-1 bg-[#e31e24] text-white px-3 py-2 text-[10px] font-bold tracking-[1px] uppercase hover:bg-[#c41a20] transition-colors disabled:opacity-50"
                >
                  <CreditCard size={12} />
                  {inTerminal ? "Ver cobro" : "Cobrar"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleVoid(sale)}
                  disabled={busy}
                  className="bg-[#131313] border border-[rgba(93,63,60,0.25)] text-[#808080] px-3 py-2 text-[10px] font-bold tracking-[1px] uppercase hover:border-[#e31e24] hover:text-[#e31e24] transition-colors disabled:opacity-50"
                >
                  {busy ? "Anulando…" : "Anular"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}