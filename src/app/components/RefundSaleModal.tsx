import { useRef, useState } from "react";
import { CheckCircle2, Loader2, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { refundPointOrder, type RefundResult } from "@/features/pos/api/pointPaymentService";
import { clientIdFromMemberId, listClientsUseCase, updateClientUseCase } from "../core/catalog";

const DEFAULT_MEMBER_PLAN_ID = 1;

export type RefundableSale = {
  id: string;
  total: number;
  ticketId?: string | null;
  linesSummary?: string | null;
  memberName?: string | null;
  transactionType?: string;
};

type Props = {
  sale: RefundableSale;
  onClose: () => void;
  /** Se llama cuando la venta quedó reembolsada (para recargar la lista) */
  onRefunded: () => void;
};

/** Resta un periodo ("1d", "1w", "1m", "3m", "12m"...) a una fecha YYYY-MM-DD. */
function subtractPeriod(iso: string, periodKey: string | null): string | null {
  const m = /^(\d+)([dwm])$/.exec(periodKey ?? "");
  if (!m) return null;
  const n = Number(m[1]);
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (m[2] === "d") d.setDate(d.getDate() - n);
  else if (m[2] === "w") d.setDate(d.getDate() - n * 7);
  else d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

/** Quita al socio el periodo de la membresía reembolsada. Devuelve la nueva fecha. */
async function revertMembership(memberId: string, periodKey: string | null): Promise<string> {
  const list = await listClientsUseCase();
  if (!list.ok) throw new Error(list.message || "No se pudo cargar el socio.");
  const member = list.members.find((m) => m.id === memberId);
  if (!member) throw new Error("No se encontró al socio en el catálogo.");

  const newDate = subtractPeriod(member.renewalDate, periodKey);
  if (!newDate) throw new Error(`No se reconoce el periodo "${periodKey ?? "—"}".`);

  const clientId = clientIdFromMemberId(member.id);
  if (!clientId) throw new Error("El socio no tiene ID de catálogo.");

  const digits = (member.phone ?? "").replace(/\D/g, "");
  const national = digits.startsWith("52") && digits.length > 10 ? digits.slice(2) : digits;

  const res = await updateClientUseCase({
    clientID: clientId,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phoneNumber: national,
    phoneCodeNumber: "52",
    fullAddress: member.address,
    planID: DEFAULT_MEMBER_PLAN_ID,
    enrollmentDate: member.enrollmentDate,
    renewalDate: newDate,
    idDocumentDataUrl: member.idDocumentDataUrl,
    isDirectDebit: member.isDirectDebit === true,
    priceRegular: member.isDirectDebit === true ? 0 : (member.regularPrice ?? 0),
    priceDirectDebit: member.isDirectDebit === true ? (member.directDebitPrice ?? 0) : 0,
  });
  if (!res.ok) throw new Error(res.message || "El catálogo no respondió.");
  return newDate;
}

const money = (v: number) =>
  v.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function RefundSaleModal({ sale, onClose, onRefunded }: Props) {
  const [phase, setPhase] = useState<"confirm" | "working" | "pending" | "done">("confirm");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const revertedRef = useRef(false);
  const isSubscription = sale.transactionType === "subscription";

  const finish = async (r: RefundResult) => {
    // Membresía: restar el periodo una sola vez por sesión del modal
    if (r.transactionType === "subscription" && r.memberId && !revertedRef.current) {
      if (r.alreadyRefunded) {
        setNote("La venta ya estaba reembolsada. Revisa la vigencia del socio en Miembros.");
      } else {
        revertedRef.current = true;
        try {
          const newDate = await revertMembership(r.memberId, r.periodKey);
          setNote(`La vigencia del socio ahora vence el ${newDate}.`);
        } catch (e) {
          setNote(
            `Reembolso hecho, pero no se pudo ajustar la vigencia: ${
              e instanceof Error ? e.message : "error inesperado"
            }. Corrígela a mano en Miembros.`,
          );
        }
      }
    } else if (r.transactionType !== "subscription") {
      setNote("Los productos regresaron al inventario.");
    }
    setPhase("done");
    onRefunded();
  };

  const run = async () => {
    setError(null);
    setPhase("working");
    try {
      const r = await refundPointOrder(sale.id);
      if (r.refundPending) {
        setPhase("pending");
        return;
      }
      await finish(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo hacer el reembolso.");
      setPhase("confirm");
    }
  };

  const working = phase === "working";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-md border border-[rgba(93,63,60,0.3)] bg-[#131313] p-5 sm:p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-1">Reembolso</p>
            <h3 className="text-[#e5e2e1] text-[16px] font-black uppercase leading-tight">
              ${money(sale.total)}
            </h3>
            <p className="text-[#808080] text-[11px] mt-1 font-mono">{sale.ticketId ?? sale.id}</p>
          </div>
          {!working ? (
            <button type="button" onClick={onClose} className="text-[#808080] hover:text-[#e31e24]" aria-label="Cerrar">
              <X size={22} />
            </button>
          ) : null}
        </div>

        {phase === "confirm" || working ? (
          <>
            <ul className="space-y-1.5 text-[12px] text-[#b0b0b0] mb-4">
              {sale.memberName ? <li>Socio: <span className="text-[#e5e2e1]">{sale.memberName}</span></li> : null}
              {sale.linesSummary ? <li>Detalle: <span className="text-[#e5e2e1]">{sale.linesSummary}</span></li> : null}
              <li>Se devuelve el total a la tarjeta del cliente con Mercado Pago.</li>
              <li>
                {isSubscription
                  ? "Se quita a la vigencia del socio el periodo pagado."
                  : "Los productos regresan al inventario."}
              </li>
              <li>La venta deja de contar en los ingresos.</li>
            </ul>
            {error ? (
              <div className="mb-3 rounded-sm border border-[#e31e24]/45 bg-[#e31e24]/10 px-3 py-2 text-[11px] text-[#ffb4ae]">
                {error}
              </div>
            ) : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={working}
                className="min-h-[44px] w-full sm:flex-1 bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#1a1a1a] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void run()}
                disabled={working}
                className="min-h-[44px] w-full sm:flex-1 bg-[#e31e24] text-white py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#c41a20] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {working ? <Loader2 className="animate-spin" size={16} /> : <RotateCcw size={14} />}
                Confirmar reembolso
              </button>
            </div>
          </>
        ) : null}

        {phase === "pending" ? (
          <div className="space-y-3 text-center py-2">
            <Loader2 className="mx-auto animate-spin text-[#ffcc80]" size={32} />
            <p className="text-[#e5e2e1] text-[13px] font-bold uppercase">Reembolso en proceso</p>
            <p className="text-[#808080] text-[11px]">
              Mercado Pago aceptó el reembolso pero aún no lo confirma. Vuelve a consultar en un momento; no se reembolsará dos veces.
            </p>
            <button
              type="button"
              onClick={() => void run()}
              className="w-full bg-[#e31e24] text-white py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#c41a20]"
            >
              Volver a consultar
            </button>
          </div>
        ) : null}

        {phase === "done" ? (
          <div className="space-y-3 text-center py-2">
            <CheckCircle2 className="mx-auto text-[#69f0ae]" size={36} />
            <p className="text-[#e5e2e1] text-[13px] font-bold uppercase">Venta reembolsada</p>
            {note ? <p className="text-[#b0b0b0] text-[11px] leading-relaxed">{note}</p> : null}
            <button
              type="button"
              onClick={() => {
                toast.success("Reembolso registrado", { description: `$${money(sale.total)} · ${sale.ticketId ?? sale.id}` });
                onClose();
              }}
              className="w-full bg-[#e31e24] text-white py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#c41a20]"
            >
              Listo
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}