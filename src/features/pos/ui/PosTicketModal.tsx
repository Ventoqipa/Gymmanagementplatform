import { X } from "lucide-react";
import type { PosLabels } from "../config/types";
import type { PosTicketReceipt } from "../domain/types";

type PosTicketModalProps = {
  receipt: PosTicketReceipt;
  labels: PosLabels;
  onClose: () => void;
};

// N: marcas que devuelve Mercado Pago en payment_method.id
const CARD_BRAND: Record<string, string> = {
  visa: "Visa",
  master: "Mastercard",
  amex: "American Express",
  debvisa: "Visa",
  debmaster: "Mastercard",
  carnet: "Carnet",
};

// N: tipo de tarjeta (payment_method.type)
const CARD_TYPE: Record<string, string> = {
  credit_card: "Crédito",
  debit_card: "Débito",
  prepaid_card: "Prepago",
};

export function PosTicketModal({
  receipt,
  labels,
  onClose,
}: PosTicketModalProps) {
  // N: datos de tarjeta / meses (solo si vienen de la terminal)
  const installments = receipt.installments ?? 1;
  const hasMsi = installments > 1;
  const brand = receipt.cardBrand
    ? CARD_BRAND[receipt.cardBrand] ?? receipt.cardBrand.toUpperCase()
    : null;
  const cardType = receipt.cardType
    ? CARD_TYPE[receipt.cardType] ?? receipt.cardType
    : null;
  const monthly = hasMsi ? receipt.total / installments : 0;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 overflow-auto">
      <div className="bg-[#f5f5f0] text-[#1a1a1a] max-w-md w-full shadow-2xl border-4 border-[#e31e24]">
        <div className="bg-[#1a1a1a] text-white px-4 py-3 flex justify-between items-center">
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#e31e24] font-bold">
              {labels.ticketBrand}
            </p>
            <p className="text-[11px] font-mono mt-1">
              Ticket · {receipt.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#aaa] hover:text-white p-1"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4 font-['Space_Grotesk',sans-serif]">
          <p className="text-[11px] text-[#555]">
            {new Date(receipt.createdIso).toLocaleString("es-MX", {
              dateStyle: "full",
              timeStyle: "short",
            })}
          </p>
          {receipt.member?.name && (
            <div className="text-[12px] border-b border-[#ddd] pb-3">
              <p className="font-bold uppercase text-[10px] text-[#e31e24]">
                {labels.ticketClient}
              </p>
              <p className="font-bold">{receipt.member.name}</p>
              {receipt.member.id && (
                <p className="font-mono text-[11px] text-[#666]">
                  {receipt.member.id}
                </p>
              )}
            </div>
          )}
          {receipt.payer?.name && (
            <div className="text-[12px] border-b border-[#ddd] pb-3">
              <p className="font-bold uppercase text-[10px] text-[#e31e24]">
                {labels.ticketPayer}
              </p>
              <p className="font-bold">{receipt.payer.name}</p>
              {receipt.payer.id && (
                <p className="font-mono text-[11px] text-[#666]">
                  {receipt.payer.id}
                </p>
              )}
            </div>
          )}
          <div className="space-y-2">
            {receipt.lines.map((line) => (
              <div
                key={`${line.id}-${line.name}`}
                className="flex justify-between gap-2 text-[12px]"
              >
                <span>
                  <span className="font-bold">{line.qty}</span>× {line.name}
                  <span className="block font-mono text-[10px] text-[#888]">
                    {line.id}
                  </span>
                </span>
                <span className="font-bold shrink-0">
                  ${line.lineTotal.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-[#ccc] pt-3 space-y-1 text-[12px]">
            <div className="flex justify-between text-[18px] font-black pt-2">
              <span>{labels.total}</span>
              <span>
                ${receipt.total.toFixed(2)} {labels.currencySuffix}
              </span>
            </div>
          </div>
          <p className="text-[11px] uppercase tracking-wide">
            {labels.ticketPayment}:{" "}
            <span className="font-bold">
              {labels.paymentMethods[receipt.paymentMethod] ??
                receipt.paymentMethod}
            </span>
          </p>
          {/* N: tarjeta y meses sin intereses */}
          {(brand || cardType) && (
            <p className="text-[11px] uppercase tracking-wide -mt-2">
              Tarjeta:{" "}
              <span className="font-bold">
                {[brand, cardType].filter(Boolean).join(" · ")}
              </span>
            </p>
          )}
          {hasMsi && (
            <div className="border border-[#e31e24] bg-[#e31e24]/5 px-3 py-2 text-[12px]">
              <p className="font-black uppercase text-[#e31e24]">
                {installments} meses sin intereses
              </p>
              <p className="text-[11px] text-[#555]">
                {installments} pagos de ${monthly.toFixed(2)} {labels.currencySuffix}
              </p>
            </div>
          )}
          <p className="text-[10px] text-[#888] text-center pt-2 leading-relaxed">
            {labels.ticketFooter}
          </p>
        </div>
        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-[#e31e24] text-white py-3 font-bold text-[11px] uppercase tracking-wide hover:bg-[#c41a20] transition-colors"
          >
            {labels.ticketClose}
          </button>
        </div>
      </div>
    </div>
  );
}