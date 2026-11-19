import type { PosReportBucket, PosSale } from "./types";

type PaymentStatus = NonNullable<PosSale["paymentStatus"]>;

/** NUEVO: ventas que no se han cobrado (se pueden retomar o anular) */
const UNPAID_STATUSES: PaymentStatus[] = ["PENDING", "REJECTED", "CANCELED", "EXPIRED"];

/** NUEVO: estado de pago; las ventas viejas sin estado se consideran pagadas */
export function salePaymentStatus(sale: PosSale): PaymentStatus {
  return sale.paymentStatus ?? "APPROVED";
}

/** NUEVO: solo las ventas aprobadas son ingreso */
export function isPaidSale(sale: PosSale): boolean {
  return salePaymentStatus(sale) === "APPROVED";
}

export function isUnpaidSale(sale: PosSale): boolean {
  return UNPAID_STATUSES.includes(salePaymentStatus(sale));
}

export function isRefundedSale(sale: PosSale): boolean {
  return salePaymentStatus(sale) === "REFUNDED";
}

/** NUEVO: CARD y TERMINAL_MP se reportan juntos como tarjeta */
export function salePaymentMethodGroup(sale: PosSale): "CASH" | "CARD" | "QR" | "OTHER" {
  const raw = String(
    (sale as { method?: string; paymentMethod?: string }).method ??
      (sale as { paymentMethod?: string }).paymentMethod ??
      "",
  ).toUpperCase();
  if (raw === "CASH") return "CASH";
  if (raw === "CARD" || raw === "TERMINAL_MP") return "CARD";
  if (raw === "QR") return "QR";
  return "OTHER";
}

/** Suma de un grupo de ventas, sin filtrar */
function sumSales(sales: PosSale[]): PosReportBucket {
  return {
    count: sales.length,
    total: sales.reduce((acc, sale) => acc + sale.total, 0),
    subtotal: sales.reduce((acc, sale) => acc + sale.subtotal, 0),
    tax: sales.reduce((acc, sale) => acc + sale.tax, 0),
  };
}

/**
 * CAMBIO: ingresos = solo ventas pagadas (APPROVED).
 * No suma cobros pendientes, rechazados, cancelados, expirados, anulados ni reembolsados.
 */
export function summarizePosSales(sales: PosSale[]): PosReportBucket {
  return sumSales(sales.filter(isPaidSale));
}

/** NUEVO: resumen completo para el corte de caja */
export type PosSalesBreakdown = {
  /** Ingresos reales (solo APPROVED) */
  income: PosReportBucket;
  /** Ingresos por método (solo APPROVED) */
  byMethod: Record<"CASH" | "CARD" | "QR" | "OTHER", PosReportBucket>;
  /** Ventas sin cobrar: PENDING, REJECTED, CANCELED, EXPIRED */
  unpaid: PosReportBucket;
  /** Devoluciones (REFUNDED) */
  refunded: PosReportBucket;
  /** Ventas anuladas (VOIDED); solo informativo */
  voided: PosReportBucket;
};

export function summarizePosSalesBreakdown(sales: PosSale[]): PosSalesBreakdown {
  const paid = sales.filter(isPaidSale);
  const byGroup = (group: ReturnType<typeof salePaymentMethodGroup>) =>
    sumSales(paid.filter((s) => salePaymentMethodGroup(s) === group));

  return {
    income: sumSales(paid),
    byMethod: {
      CASH: byGroup("CASH"),
      CARD: byGroup("CARD"),
      QR: byGroup("QR"),
      OTHER: byGroup("OTHER"),
    },
    unpaid: sumSales(sales.filter(isUnpaidSale)),
    refunded: sumSales(sales.filter(isRefundedSale)),
    voided: sumSales(sales.filter((s) => salePaymentStatus(s) === "VOIDED")),
  };
}
