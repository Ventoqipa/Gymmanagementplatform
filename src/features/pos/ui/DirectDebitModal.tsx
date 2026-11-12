import { useMemo, useState } from "react";
import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import { CheckCircle2, Loader2, X } from "lucide-react";
import {
  createDirectDebit,
  type DirectDebitSubscription,
} from "../api/subscriptionService";

const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY as string | undefined;
let mpInitialized = false;

export function ensureMercadoPago(): boolean {
  if (!MP_PUBLIC_KEY) return false;
  if (!mpInitialized) {
    initMercadoPago(MP_PUBLIC_KEY, { locale: "es-MX" });
    mpInitialized = true;
  }
  return true;
}

type Props = {
  memberId: string;
  memberName: string;
  defaultEmail?: string;
  /** Cobro mensual */
  amount: number;
  months: number;
  periodKey?: string | null;
  priceBranchFrequencyId?: number;
  onClose: () => void;
  onSuccess: (subscription: DirectDebitSubscription) => void;
};

export function DirectDebitModal({
  memberId,
  memberName,
  defaultEmail,
  amount,
  months,
  periodKey,
  priceBranchFrequencyId,
  onClose,
  onSuccess,
}: Props) {
  const ready = useMemo(() => ensureMercadoPago(), []);
  const [phase, setPhase] = useState<"form" | "done">("form");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [subscription, setSubscription] = useState<DirectDebitSubscription | null>(null);

  const money = (v: number) =>
    v.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleSubmit = async (formData: {
    token: string;
    payer?: { email?: string };
  }) => {
    setError(null);
    setSending(true);
    try {
      const sub = await createDirectDebit({
        memberId,
        memberName,
        payerEmail: formData.payer?.email || defaultEmail || "",
        cardTokenId: formData.token,
        amount,
        months,
        periodKey,
        priceBranchFrequencyId,
      });
      if (sub.status !== "authorized") {
        throw new Error(
          sub.lastError || `Mercado Pago dejó la domiciliación en estado "${sub.status}".`,
        );
      }
      setSubscription(sub);
      setPhase("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo autorizar la tarjeta.";
      setError(msg);
      // El Brick muestra su propio estado de error al rechazar
      throw e;
    } finally {
      setSending(false);
    }
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
            <p className="text-[#a8a4a3] text-[11px] mt-1">
              {months} cargos mensuales de{" "}
              <span className="text-[#e5e2e1] font-bold">${money(amount)}</span> · total $
              {money(amount * months)}
            </p>
          </div>
          {phase === "form" ? (
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="text-[#808080] hover:text-[#e31e24] disabled:opacity-40"
              aria-label="Cerrar"
            >
              <X size={22} />
            </button>
          ) : null}
        </div>

        {!ready ? (
          <p className="text-[#ff8a80] text-[12px]">
            Falta configurar <code>VITE_MP_PUBLIC_KEY</code> en el .env de React.
          </p>
        ) : phase === "form" ? (
          <>
            <p className="text-[#808080] text-[10px] leading-relaxed mb-3">
              El socio captura su tarjeta. El primer cargo se hace hoy y los siguientes cada mes,
              automáticamente.
            </p>
            {error ? (
              <div className="mb-3 rounded-sm border border-[#e31e24]/45 bg-[#e31e24]/10 px-3 py-2 text-[11px] text-[#ffb4ae]">
                {error}
              </div>
            ) : null}
            <CardPayment
              initialization={{ amount, payer: { email: defaultEmail ?? "" } }}
              customization={{
                paymentMethods: { maxInstallments: 1 },
                visual: { style: { theme: "dark" } },
              }}
              onSubmit={handleSubmit}
              onError={(e) => console.error("[CardPayment]", e)}
            />
            {sending ? (
              <p className="mt-3 flex items-center gap-2 text-[#808080] text-[11px]">
                <Loader2 size={14} className="animate-spin" /> Autorizando con Mercado Pago…
              </p>
            ) : null}
          </>
        ) : (
          <div className="py-4 text-center space-y-3">
            <CheckCircle2 size={40} className="mx-auto text-[#69f0ae]" />
            <p className="text-[#e5e2e1] text-[14px] font-bold uppercase">Domiciliación autorizada</p>
            {subscription?.nextPaymentDate ? (
              <p className="text-[#808080] text-[11px]">
                Próximo cargo:{" "}
                {new Date(subscription.nextPaymentDate).toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => subscription && onSuccess(subscription)}
              className="w-full bg-[#e31e24] text-white py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#c41a20]"
            >
              Continuar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}