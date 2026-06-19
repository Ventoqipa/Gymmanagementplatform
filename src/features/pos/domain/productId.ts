import type { PosProduct } from "./types";

const CATEGORY_PREFIX: Record<string, string> = {
  SUPPLEMENTS: "SUP",
  GEAR: "GEAR",
  ACCESSORIES: "ACC",
};

export function getCategoryPrefix(category: string): string {
  return CATEGORY_PREFIX[category] ?? "PRD";
}

export function generateProductSku(
  category: string,
  existingProducts: PosProduct[],
): string {
  const prefix = getCategoryPrefix(category);
  const existingIds = existingProducts
    .filter((p) => p.id.startsWith(prefix))
    .map((p) => parseInt(p.id.split("-")[1], 10))
    .filter((n) => !Number.isNaN(n));
  const nextNumber =
    existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
  return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
}
