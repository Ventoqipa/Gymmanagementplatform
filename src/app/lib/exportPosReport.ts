import type { PayerSalesSummary, PosReportBucket, PosSale } from "@/features/pos";
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
        "Cliente",
        "ID cliente",
        "Atendió",
        "ID cajero",
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
        "Cliente",
        "ID cliente",
        "Atendió",
        "ID cajero",
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

export function exportCashierReport(
  rows: PayerSalesSummary[],
  from: string,
  to: string,
): void {
  const totalCount = rows.reduce((acc, row) => acc + row.totalCount, 0);
  const totalAmount = rows.reduce((acc, row) => acc + row.totalAmount, 0);

  downloadExcelReport(buildFilename("reporte_vendedor", from, to), [
    {
      title: "Resumen por cajero",
      headers: ["Concepto", "Valor"],
      rows: [
        ["Periodo", `${from} — ${to}`],
        ["Vendedores", rows.length],
        ["Transacciones", totalCount],
        ["Total cobrado", totalAmount.toFixed(2)],
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
      ]),
    },
  ]);
}
