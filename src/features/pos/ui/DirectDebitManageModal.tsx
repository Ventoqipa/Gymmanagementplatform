import { useEffect, useState } from "react";
import { CardPayment } from "@mercadopago/sdk-react";
import { CheckCircle2, CreditCard, Loader2, X } from "lucide-react";
import { ensureMercadoPago } from "./DirectDebitModal";
import {
  cancelDirectDebit,
  getMemberDirectDebit,
  updateDirectDebitCard,
  type DirectDebitSubscription,
} from "../api/subscriptionService";

type Props = {
  memberId: string;
  memberName: string;
  defaultEmail?: string;
  onClose: () => void;
  /** Se llama al cambiar tarjeta o cancelar, para refrescar la ficha */
  onChanged?: (subscription: DirectDebitSubscription | null) => void;
};

type Phase = "loading" | "none" | "view" | "card" | "done";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  authorized: { label: "Activo", className: "text-[#69f0ae] border-[#00c853]/40 bg-[#00c853]/10" },
  pending: { label: "Pendiente", className: "text-[#ffcc80] border-[#ffa726]/40 bg-[#ffa726]/10" },
  paused: { label: "Pausado", className: "text-[#ffcc80] border-[#ffa726]/40 bg-[#ffa726]/10" },
  cancelled: { label: "Cancelado", className: "text-[#a0a0a0] border-[#5a5a5a]/50 bg-[#2a2a2a]" },
};

const money = (v: number) =>
  v.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const shortDate = (v?: number | string | null) =>
  v
    ? new Date(v).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
    : "—";

export function DirectDebitManageModal({
  memberId,
  memberName,
  defaultEmail,
  onClose,
  onChanged,
}: Props) {
  const ready = ensureMercadoPago();
  const [phase, setPhase] = useState<Phase>("loading");
  const [sub, setSub] = useState<DirectDebitSubscription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [doneMessage, setDoneMessage] = useState("");

  // Carga el domiciliado activo del socio
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const found = await getMemberDirectDebit(memberId);
        if (cancelled) return;
        setSub(found);
        setPhase(found ? "view" : "none");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "No se pudo consultar el domiciliado.");
        setPhase("none");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  // El socio capturó la tarjeta nueva en el formulario
  const handleCardSubmit = async (formData: { token: string }) => {
    if (!sub) return;
    setError(null);
    setWorking(true);
    try {
      const updated = await updateDirectDebitCard(sub.id, formData.token);
      setSub(updated);
      setDoneMessage("Tarjeta actualizada. Los siguientes cargos se harán con la nueva tarjeta.");
      setPhase("done");
      onChanged?.(updated);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Mercado Pago no aceptó la tarjeta nueva. Se sigue cobrando con la anterior.",
      );
      throw e; // el formulario muestra su propio error
    } finally {
      setWorking(false);
    }
  };

  const handleCancelDebit = async () => {
    if (!sub) return;
    if (!window.confirm(`¿Cancelar el pago domiciliado de ${memberName}? Ya no se harán más cargos.`)) {
      return;
    }
    setError(null);
    setWorking(true);
    try {
      const updated = await cancelDirectDebit(sub.id);
      setSub(updated);
      setDoneMessage("Domiciliado cancelado. Ya no se harán más cargos a la tarjeta.");
      setPhase("done");
      onChanged?.(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cancelar. Intenta de nuevo.");
    } finally {
      setWorking(false);
    }
  };

  const badge = STATUS_LABEL[sub?.status ?? ""] ?? {
    label: sub?.status ?? "",
    className: "text-[#a0a0a0] border-[#5a5a5a]/50 bg-[#2a2a2a]",
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto border border-[rgba(93,63,60,0.3)] bg-[#131313] p-5 sm:p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-1">
              Pago domiciliado
            </p>
            <h3 className="text-[#e5e2e1] text-[16px] font-black uppercase leading-tight">
              {memberName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={working}
            className="text-[#808080] hover:text-[#e31e24] disabled:opacity-40"
            aria-label="Cerrar"
          >
            <X size={22} />
          </button>
        </div>

        {error ? (
          <div className="mb-3 border border-[#e31e24]/45 bg-[#e31e24]/10 px-3 py-2 text-[11px] text-[#ffb4ae]">
            {error}
          </div>
        ) : null}

        {phase === "loading" && (
          <p className="flex items-center gap-2 text-[#808080] text-[12px] py-6 justify-center">
            <Loader2 size={16} className="animate-spin" /> Consultando domiciliado…
          </p>
        )}

        {phase === "none" && (
          <p className="text-[#808080] text-[12px] py-4">
            Este socio no tiene un pago domiciliado activo.
          </p>
        )}

        {phase === "view" && sub && (
          <div className="space-y-4">
            <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.15)] p-4 space-y-2 text-[12px]">
              <div className="flex justify-between items-center">
                <span className="text-[#808080]">Estado</span>
                <span
                  className={`px-1.5 py-0.5 border text-[9px] font-bold uppercase tracking-wide ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#808080]">Cargo mensual</span>
                <span className="text-[#e5e2e1] font-bold tabular-nums">${money(sub.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#808080]">Próximo cargo</span>
                <span className="text-[#e5e2e1] font-bold">{shortDate(sub.nextPaymentDate)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setPhase("card");
              }}
              disabled={working || !ready}
              className="w-full bg-[#e31e24] text-white py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#c41a20] disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <CreditCard size={14} /> Cambiar tarjeta
            </button>
            <button
              type="button"
              onClick={() => void handleCancelDebit()}
              disabled={working}
              className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.25)] text-[#e5e2e1] py-3 font-bold text-[10px] tracking-[1px] uppercase hover:border-[#e31e24] hover:text-[#e31e24] disabled:opacity-50"
            >
              {working ? "Cancelando…" : "Cancelar domiciliado"}
            </button>
            {!ready && (
              <p className="text-[#ff8a80] text-[11px]">
                Falta configurar <code>VITE_MP_PUBLIC_KEY</code> en el .env de React.
              </p>
            )}
          </div>
        )}

        {phase === "card" && sub && (
          <>
            <p className="text-[#808080] text-[10px] leading-relaxed mb-3">
              El socio captura su tarjeta nueva. No se hace ningún cargo ahora: el siguiente cargo
              mensual (${money(sub.amount)}) se hará con esta tarjeta.
            </p>
            <CardPayment
              initialization={{ amount: sub.amount, payer: { email: defaultEmail ?? "" } }}
              customization={{
                paymentMethods: { maxInstallments: 1 },
                visual: { style: { theme: "dark" } },
              }}
              onSubmit={handleCardSubmit}
              onError={(e) => console.error("[CardPayment]", e)}
            />
            {working ? (
              <p className="mt-3 flex items-center gap-2 text-[#808080] text-[11px]">
                <Loader2 size={14} className="animate-spin" /> Actualizando con Mercado Pago…
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setPhase("view")}
                className="mt-3 w-full text-[#808080] text-[10px] font-bold uppercase tracking-wide hover:text-[#e5e2e1]"
              >
                Regresar
              </button>
            )}
          </>
        )}

        {phase === "done" && (
          <div className="py-4 text-center space-y-3">
            <CheckCircle2 size={40} className="mx-auto text-[#69f0ae]" />
            <p className="text-[#e5e2e1] text-[13px] font-bold">{doneMessage}</p>
            {sub?.status === "authorized" && sub.nextPaymentDate ? (
              <p className="text-[#808080] text-[11px]">Próximo cargo: {shortDate(sub.nextPaymentDate)}</p>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-[#e31e24] text-white py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#c41a20]"
            >
              Listo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}