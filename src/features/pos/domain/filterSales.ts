import type { PosSale, PosTransactionType } from "./types";

/** Clasifica ventas aunque el API no envíe transactionType o ignore ?type= */
export function resolveTransactionType(sale: PosSale): PosTransactionType {
  if (sale.transactionType === "subscription" || sale.transactionType === "product") {
    return sale.transactionType;
  }
  if (sale.subscriptionConcept || sale.periodKey) {
    return "subscription";
  }
  if (sale.lines && sale.lines.length > 0) {
    return "product";
  }
  const summary = (sale.linesSummary ?? "").toLowerCase();
  if (
    summary.includes("alta de suscripción") ||
    summary.includes("alta de suscripcion") ||
    summary.includes("renovación") ||
    summary.includes("renovacion") ||
    (summary.includes("suscripción") && !summary.includes("×")) ||
    (summary.includes("suscripcion") && !summary.includes("×"))
  ) {
    return "subscription";
  }
  return "product";
}

export function filterSalesByType(
  sales: PosSale[],
  type: PosTransactionType,
): PosSale[] {
  return sales.filter((sale) => resolveTransactionType(sale) === type);
}

export function normalizePosSale(sale: PosSale): PosSale {
  return {
    ...sale,
    transactionType: resolveTransactionType(sale),
  };
}
