import type { PosReportBucket, PosSale } from "./types";

export function summarizePosSales(sales: PosSale[]): PosReportBucket {
  return {
    count: sales.length,
    total: sales.reduce((acc, sale) => acc + sale.total, 0),
    subtotal: sales.reduce((acc, sale) => acc + sale.subtotal, 0),
    tax: sales.reduce((acc, sale) => acc + sale.tax, 0),
  };
}
