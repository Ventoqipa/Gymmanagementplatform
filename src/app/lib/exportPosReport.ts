import type { PayerSalesSummary, PosReportBucket, PosSale } from "@/features/pos";
import {
  isPaidSale, // N
  salePaymentStatus, // N
  summarizePosSalesBreakdown, // N
} from "@/features/pos";
import { downloadExcelReport, type ExcelSection } from "./exportExcel";
import { MEMBERSHIP_CONCEPT, PAYMENT_METHOD } from "./labels";

// NUEVO: estado de pago en español para el Excel
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  APPROVED: "Pagada",
  PENDING: "Pendiente",
  REJECTED: "Rechazada",
  CANCELED: "Cancelada",
  EXPIRED: "Expirada",
  VOIDED: "Anulada",
  REFUNDED: "Reembolsada",
};

function statusLabel(sale: PosSale): string {
  const status = salePaymentStatus(sale);
  return PAYMENT_STATUS_LABEL[status] ?? status;
}

/** NUEVO: lo que realmente entró a caja por esta venta */
function collectedAmount(sale: PosSale): string {
  return (isPaidSale(sale) ? sale.total : 0).toFixed(2);
}

function formatSaleDate(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function buildFilename(prefix: string, from: string, to: string): string {
  return `${prefix}_${from}_${to}`;
}

/**
 * CAMBIO: el resumen deja claro que solo cuenta ventas pagadas.
 * Si se pasan las ventas, agrega lo no cobrado, reembolsos y desglose por método.
 */
function summarySection(
  from: string,
  to: string,
  bucket: PosReportBucket,
  sales?: PosSale[],
): ExcelSection {
  const rows: (string | number)[][] = [
    ["Periodo", `${from} — ${to}`],
    ["Transacciones pagadas", bucket.count],
    ["Subtotal", bucket.subtotal.toFixed(2)],
    ["IVA", bucket.tax.toFixed(2)],
    ["Total cobrado", bucket.total.toFixed(2)],
  ];

  if (sales) {
    const b = summarizePosSalesBreakdown(sales);
    rows.push(
      ["Efectivo", b.byMethod.CASH.total.toFixed(2)],
      ["Tarjeta", b.byMethod.CARD.total.toFixed(2)],
      ["QR", b.byMethod.QR.total.toFixed(2)],
      ["Sin cobrar (no suma)", `${b.unpaid.count} · ${b.unpaid.total.toFixed(2)}`],
      ["Reembolsadas (no suma)", `${b.refunded.count} · ${b.refunded.total.toFixed(2)}`],
      ["Anuladas (no suma)", `${b.voided.count} · ${b.voided.total.toFixed(2)}`],
    );
  }

  return {
    title: "Resumen del periodo (solo ventas pagadas)",
    headers: ["Concepto", "Valor"],
    rows,
  };
}

export function exportProductSalesReport(
  sales: PosSale[],
  bucket: PosReportBucket,
  from: string,
  to: string,
): void {
  downloadExcelReport(buildFilename("reporte_productos", from, to), [
    summarySection(from, to, bucket, sales), // CAMBIO
    {
      title: "Detalle de ventas",
      headers: [
        "ID",
        "Fecha",
        "Estado", // N
        "Total",
        "Cobrado", // N
        "Subtotal",
        "IVA",
        "Método de pago",
        "Detalle",
        "Cliente",
        "ID cliente",
        "Atendió",
        "ID cajero",
      ],
      rows: sales.map((sale) => [
        sale.id,
        formatSaleDate(sale.dateIso),
        statusLabel(sale), // N
        sale.total.toFixed(2),
        collectedAmount(sale), // N
        sale.subtotal.toFixed(2),
        sale.tax.toFixed(2),
        PAYMENT_METHOD[sale.method] ?? sale.method,
        sale.linesSummary,
        sale.memberName ?? "",
        sale.memberId ?? "",
        sale.payerName ?? "",
        sale.payerId ?? "",
      ]),
    },
  ]);
}

export function exportSubscriptionSalesReport(
  sales: PosSale[],
  bucket: PosReportBucket,
  from: string,
  to: string,
): void {
  downloadExcelReport(buildFilename("reporte_suscripciones", from, to), [
    summarySection(from, to, bucket, sales), // CAMBIO
    {
      title: "Detalle de suscripciones",
      headers: [
        "ID",
        "Fecha",
        "Estado", // N
        "Total",
        "Cobrado", // N
        "Subtotal",
        "IVA",
        "Método de pago",
        "Concepto",
        "Periodo",
        "Detalle",
        "Cliente",
        "ID cliente",
        "Atendió",
        "ID cajero",
      ],
      rows: sales.map((sale) => [
        sale.id,
        formatSaleDate(sale.dateIso),
        statusLabel(sale), // N
        sale.total.toFixed(2),
        collectedAmount(sale), // N
        sale.subtotal.toFixed(2),
        sale.tax.toFixed(2),
        PAYMENT_METHOD[sale.method] ?? sale.method,
        sale.subscriptionConcept
          ? (MEMBERSHIP_CONCEPT[sale.subscriptionConcept] ?? sale.subscriptionConcept)
          : "",
        sale.periodKey ?? "",
        sale.linesSummary,
        sale.memberName ?? "",
        sale.memberId ?? "",
        sale.payerName ?? "",
        sale.payerId ?? "",
      ]),
    },
  ]);
}

export function exportTopProductsReport(
  products: { name: string; sales: number; units: number }[],
  from: string,
  to: string,
): void {
  downloadExcelReport(buildFilename("productos_mas_vendidos", from, to), [
    {
      // CAMBIO: el ranking ya llega filtrado a ventas pagadas desde Reports.tsx
      title: `Productos más vendidos (solo ventas pagadas) · ${from} — ${to}`,
      headers: ["Ranking", "Producto", "Ventas ($)", "Unidades"],
      rows: products.map((product, index) => [
        index + 1,
        product.name,
        product.sales.toFixed(2),
        product.units,
      ]),
    },
  ]);
}

export function exportPeriodSummaryReport(
  bucket: PosReportBucket,
  from: string,
  to: string,
  kind: "products" | "subscriptions",
): void {
  const prefix =
    kind === "products" ? "resumen_productos" : "resumen_suscripciones";
  downloadExcelReport(buildFilename(prefix, from, to), [
    summarySection(from, to, bucket),
  ]);
}

export function exportCashierReport(
  rows: PayerSalesSummary[],
  from: string,
  to: string,
): void {
  const totalCount = rows.reduce((acc, row) => acc + row.totalCount, 0);
  const totalAmount = rows.reduce((acc, row) => acc + row.totalAmount, 0);
  const unpaidCount = rows.reduce((acc, row) => acc + row.unpaidCount, 0); // N
  const unpaidTotal = rows.reduce((acc, row) => acc + row.unpaidTotal, 0); // N

  downloadExcelReport(buildFilename("reporte_vendedor", from, to), [
    {
      title: "Resumen por cajero (solo ventas pagadas)",
      headers: ["Concepto", "Valor"],
      rows: [
        ["Periodo", `${from} — ${to}`],
        ["Vendedores", rows.length],
        ["Transacciones pagadas", totalCount],
        ["Total cobrado", totalAmount.toFixed(2)],
        ["Sin cobrar (no suma)", `${unpaidCount} · ${unpaidTotal.toFixed(2)}`], // N
      ],
    },
    {
      title: "Detalle por cajero",
      headers: [
        "Cajero",
        "ID cajero",
        "Ventas productos",
        "Monto productos",
        "Suscripciones",
        "Monto suscripciones",
        "Total transacciones",
        "Total cobrado",
        "Sin cobrar", // N
        "Monto sin cobrar", // N
      ],
      rows: rows.map((row) => [
        row.payerName,
        row.payerId,
        row.productCount,
        row.productTotal.toFixed(2),
        row.subscriptionCount,
        row.subscriptionTotal.toFixed(2),
        row.totalCount,
        row.totalAmount.toFixed(2),
        row.unpaidCount, // N
        row.unpaidTotal.toFixed(2), // N
      ]),
    },
  ]);
}