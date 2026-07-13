import { resolveTransactionType } from "./filterSales";
import type { PosSale } from "./types";

export type PayerSalesSummary = {
  key: string;
  payerId: string;
  payerName: string;
  productCount: number;
  productTotal: number;
  subscriptionCount: number;
  subscriptionTotal: number;
  totalCount: number;
  totalAmount: number;
};

const SIN_CAJERO_KEY = "__sin_cajero__";

export function payerKeyFromSale(sale: PosSale): string {
  const id = sale.payerId?.trim() ?? "";
  const name = sale.payerName?.trim() ?? "";
  if (id) return id;
  if (name) return `name:${name.toUpperCase()}`;
  return SIN_CAJERO_KEY;
}

export function payerLabelFromSale(sale: PosSale): { id: string; name: string } {
  const id = sale.payerId?.trim() ?? "";
  const name = sale.payerName?.trim() ?? "";
  if (!id && !name) {
    return { id: "", name: "Sin cajero" };
  }
  return { id, name: name || id };
}

export function filterSalesByPayer(
  sales: PosSale[],
  payerKey: string,
): PosSale[] {
  if (!payerKey || payerKey === "ALL") return sales;
  return sales.filter((sale) => payerKeyFromSale(sale) === payerKey);
}

/** Agrupa ventas del periodo por cajero (payer). */
export function summarizeSalesByPayer(sales: PosSale[]): PayerSalesSummary[] {
  const map = new Map<string, PayerSalesSummary>();

  for (const sale of sales) {
    const key = payerKeyFromSale(sale);
    const { id, name } = payerLabelFromSale(sale);
    const type = resolveTransactionType(sale);

    let row = map.get(key);
    if (!row) {
      row = {
        key,
        payerId: id,
        payerName: name,
        productCount: 0,
        productTotal: 0,
        subscriptionCount: 0,
        subscriptionTotal: 0,
        totalCount: 0,
        totalAmount: 0,
      };
      map.set(key, row);
    }

    if (type === "subscription") {
      row.subscriptionCount += 1;
      row.subscriptionTotal += sale.total;
    } else {
      row.productCount += 1;
      row.productTotal += sale.total;
    }
    row.totalCount += 1;
    row.totalAmount += sale.total;
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.totalAmount !== a.totalAmount) {
      return b.totalAmount - a.totalAmount;
    }
    return a.payerName.localeCompare(b.payerName, "es");
  });
}
