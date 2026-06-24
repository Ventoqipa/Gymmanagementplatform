import type { PosReportBucket, PosSale } from "@/features/pos";
import { downloadExcelReport, type ExcelSection } from "./exportExcel";
import { MEMBERSHIP_CONCEPT, PAYMENT_METHOD } from "./labels";

function formatSaleDate(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function buildFilename(prefix: string, from: string, to: string): string {
  return `${prefix}_${from}_${to}`;
}

function summarySection(
  from: string,
  to: string,
  bucket: PosReportBucket,
): ExcelSection {
  return {
    title: "Resumen del periodo",
    headers: ["Concepto", "Valor"],
    rows: [
      ["Periodo", `${from} — ${to}`],
      ["Transacciones", bucket.count],
      ["Subtotal", bucket.subtotal.toFixed(2)],
      ["IVA", bucket.tax.toFixed(2)],
      ["Total", bucket.total.toFixed(2)],
    ],
  };
}

export function exportProductSalesReport(
  sales: PosSale[],
  bucket: PosReportBucket,
  from: string,
  to: string,
): void {
  downloadExcelReport(buildFilename("reporte_productos", from, to), [
    summarySection(from, to, bucket),
    {
      title: "Detalle de ventas",
      headers: [
        "ID",
        "Fecha",
        "Total",
        "Subtotal",
        "IVA",
        "Método de pago",
        "Detalle",
        "Miembro",
        "ID miembro",
      ],
      rows: sales.map((sale) => [
        sale.id,
        formatSaleDate(sale.dateIso),
        sale.total.toFixed(2),
        sale.subtotal.toFixed(2),
        sale.tax.toFixed(2),
        PAYMENT_METHOD[sale.method] ?? sale.method,
        sale.linesSummary,
        sale.memberName ?? "",
        sale.memberId ?? "",
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
    summarySection(from, to, bucket),
    {
      title: "Detalle de suscripciones",
      headers: [
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
      ],
      rows: sales.map((sale) => [
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
      title: `Productos más vendidos · ${from} — ${to}`,
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
