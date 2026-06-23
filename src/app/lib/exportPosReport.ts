import type { PosReportBucket, PosSale } from "@/features/pos";
import { downloadExcelCsv } from "./exportExcel";
import { MEMBERSHIP_CONCEPT, PAYMENT_METHOD } from "./labels";

function formatSaleDate(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function buildFilename(prefix: string, from: string, to: string): string {
  return `${prefix}_${from}_${to}.csv`;
}

function summaryRows(
  from: string,
  to: string,
  bucket: PosReportBucket,
): (string | number)[][] {
  return [
    ["Periodo", `${from} — ${to}`],
    ["Transacciones", bucket.count],
    ["Subtotal", bucket.subtotal.toFixed(2)],
    ["IVA", bucket.tax.toFixed(2)],
    ["Total", bucket.total.toFixed(2)],
    [],
  ];
}

export function exportProductSalesReport(
  sales: PosSale[],
  bucket: PosReportBucket,
  from: string,
  to: string,
): void {
  const detailHeaders = [
    "ID",
    "Fecha",
    "Total",
    "Subtotal",
    "IVA",
    "Método de pago",
    "Detalle",
    "Miembro",
    "ID miembro",
  ];
  const detailRows = sales.map((sale) => [
    sale.id,
    formatSaleDate(sale.dateIso),
    sale.total.toFixed(2),
    sale.subtotal.toFixed(2),
    sale.tax.toFixed(2),
    PAYMENT_METHOD[sale.method] ?? sale.method,
    sale.linesSummary,
    sale.memberName ?? "",
    sale.memberId ?? "",
  ]);

  downloadExcelCsv(
    buildFilename("reporte_productos", from, to),
    ["Campo", "Valor"],
    [
      ...summaryRows(from, to, bucket),
      detailHeaders,
      ...detailRows,
    ],
  );
}

export function exportSubscriptionSalesReport(
  sales: PosSale[],
  bucket: PosReportBucket,
  from: string,
  to: string,
): void {
  const detailHeaders = [
    "ID",
    "Fecha",
    "Total",
    "Subtotal",
    "IVA",
    "Método de pago",
    "Concepto",
    "Periodo",
    "Detalle",
    "Miembro",
    "ID miembro",
  ];
  const detailRows = sales.map((sale) => [
    sale.id,
    formatSaleDate(sale.dateIso),
    sale.total.toFixed(2),
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
  ]);

  downloadExcelCsv(
    buildFilename("reporte_suscripciones", from, to),
    ["Campo", "Valor"],
    [
      ...summaryRows(from, to, bucket),
      detailHeaders,
      ...detailRows,
    ],
  );
}

export function exportTopProductsReport(
  products: { name: string; sales: number; units: number }[],
  from: string,
  to: string,
): void {
  downloadExcelCsv(
    buildFilename("productos_mas_vendidos", from, to),
    ["Ranking", "Producto", "Ventas ($)", "Unidades"],
    [
      ["Periodo", `${from} — ${to}`, "", ""],
      [],
      ...products.map((product, index) => [
        index + 1,
        product.name,
        product.sales.toFixed(2),
        product.units,
      ]),
    ],
  );
}

export function exportPeriodSummaryReport(
  bucket: PosReportBucket,
  from: string,
  to: string,
  kind: "products" | "subscriptions",
): void {
  const prefix =
    kind === "products" ? "resumen_productos" : "resumen_suscripciones";
  downloadExcelCsv(
    buildFilename(prefix, from, to),
    ["Concepto", "Valor"],
    summaryRows(from, to, bucket).filter((row) => row.length > 0),
  );
}
