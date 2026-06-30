import { IVA_REGIMEN_LABEL } from "./tax";
import type {
  PosTicketReceipt,
  SubscriptionCheckoutInput,
  SubscriptionConcept,
} from "./types";

const CONCEPT_LABELS: Record<SubscriptionConcept, string> = {
  MEMBERSHIP: "Alta de suscripción",
  RENEWAL: "Renovación",
  OTHER: "Suscripción",
};

export function subscriptionConceptLabel(
  concept: SubscriptionConcept = "MEMBERSHIP",
): string {
  return CONCEPT_LABELS[concept] ?? CONCEPT_LABELS.OTHER;
}

export function buildSubscriptionReceipt(
  input: SubscriptionCheckoutInput,
  ticketId: string,
  createdIso?: string,
): PosTicketReceipt {
  const concept = input.concept ?? "MEMBERSHIP";
  const label = subscriptionConceptLabel(concept);
  const periodSuffix = input.periodKey ? ` · ${input.periodKey}` : "";
  const lineName = `${label}${periodSuffix}`;
  const amount = input.amount;
  const created = createdIso ?? new Date().toISOString();

  return {
    id: ticketId,
    lines: [
      {
        name: lineName,
        id: `SUB-${concept}`,
        qty: 1,
        unit: amount,
        lineTotal: amount,
      },
    ],
    subtotal: amount,
    tax: 0,
    total: amount,
    paymentMethod: input.paymentMethod,
    member:
      input.memberId || input.memberName
        ? { id: input.memberId, name: input.memberName }
        : undefined,
    payer:
      input.payerId || input.payerName
        ? { id: input.payerId, name: input.payerName }
        : undefined,
    createdIso: created,
    ivaRegimen: "sin_iva",
    ivaRate: 0,
    ivaLabelShort: IVA_REGIMEN_LABEL.sin_iva,
  };
}

export function ticketIdFromSaleId(saleId: string): string {
  return saleId.startsWith("POS-")
    ? saleId.replace(/^POS-/, "TKT-")
    : saleId;
}
