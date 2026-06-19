import type { CartLine, IvaRegimen } from "./types";

export const IVA_REGIMEN_LABEL: Record<IvaRegimen, string> = {
  general: "IVA",
  exento: "Exento",
  sin_iva: "",
};

const IVA_RATES: Record<IvaRegimen, number> = {
  general: 0,
  exento: 0,
  sin_iva: 0,
};

export function calcTotals(
  lines: CartLine[],
  regimen: IvaRegimen = "sin_iva",
): { subtotal: number; tax: number; total: number; ivaRate: number } {
  const subtotal = lines.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const ivaRate = IVA_RATES[regimen];
  const tax = subtotal * ivaRate;
  return { subtotal, tax, total: subtotal + tax, ivaRate };
}
