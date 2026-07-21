import { catalogConfig, catalogUrl } from "../../config/catalog";
import { catalogRequest } from "./catalogApiClient";
import type {
  CatalogBranchPrice,
  CatalogBranchPriceRaw,
  CatalogBranchPricesData,
} from "./types";

function readRaw(
  item: CatalogBranchPriceRaw,
  pascal: keyof CatalogBranchPriceRaw,
  camel: keyof CatalogBranchPriceRaw,
): unknown {
  const raw = item as Record<string, unknown>;
  return raw[pascal as string] ?? raw[camel as string];
}

export function normalizeBranchPrice(
  item: CatalogBranchPriceRaw,
): CatalogBranchPrice {
  return {
    priceBranchFrequencyID:
      Number(readRaw(item, "PriceBranchFrequencyID", "priceBranchFrequencyID")) ||
      0,
    branchName: String(readRaw(item, "BranchName", "branchName") ?? "").trim(),
    frequencyName: String(
      readRaw(item, "FrequencyName", "frequencyName") ?? "",
    ).trim(),
    priceRegular: Number(readRaw(item, "PriceRegular", "priceRegular")) || 0,
    priceDirectDebit:
      Number(readRaw(item, "PriceDirectDebit", "priceDirectDebit")) || 0,
  };
}

export function normalizeBranchPrices(data: unknown): CatalogBranchPrice[] {
  if (Array.isArray(data)) {
    return (data as CatalogBranchPriceRaw[]).map(normalizeBranchPrice);
  }
  if (data && typeof data === "object") {
    const obj = data as CatalogBranchPricesData & Record<string, unknown>;
    const list = obj.price ?? obj.Price;
    if (Array.isArray(list)) {
      return list.map(normalizeBranchPrice);
    }
  }
  return [];
}

export async function fetchPricesByBranch(
  branchId: number,
): Promise<CatalogBranchPrice[]> {
  const data = await catalogRequest<CatalogBranchPricesData | unknown>({
    method: "GET",
    url: catalogUrl(catalogConfig.paths.pricesByBranch(branchId)),
  });
  return normalizeBranchPrices(data);
}
