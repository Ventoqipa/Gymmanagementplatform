import type { PosProduct } from "./types";

export function generateProductSku(
  category: string,
  existingProducts: PosProduct[],
): string {
  const prefix =
    category === "SUPPLEMENTS"
      ? "SUP"
      : category === "GEAR"
        ? "GEAR"
        : "ACC";
  const existingIds = existingProducts
    .filter((p) => p.id.startsWith(prefix))
    .map((p) => parseInt(p.id.split("-")[1], 10))
    .filter((n) => !Number.isNaN(n));
  const nextNumber = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
  return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
}
