import type { IvaRegimen } from "./types";

export const IVA_TASA_GENERAL = 0.16;
export const IVA_TASA_FRONTERA = 0.08;

export const IVA_REGIMEN_LABEL: Record<IvaRegimen, string> = {
  general: "IVA 16%",
  frontera: "IVA 8%",
};

export function getIvaRate(regimen: IvaRegimen): number {
  return regimen === "general" ? IVA_TASA_GENERAL : IVA_TASA_FRONTERA;
}

export function calcTotals(
  lines: { price: number; quantity: number }[],
  regimen: IvaRegimen,
) {
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const ivaRate = getIvaRate(regimen);
  const tax = subtotal * ivaRate;
  return { subtotal, tax, total: subtotal + tax, ivaRate };
}
