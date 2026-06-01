import { loadJson, saveJson } from "@/app/lib/storage";
import type { PosProduct, PosSale } from "../domain/types";

const PRODUCTS_KEY = "elite_gym_v1_pos_products";
const SALES_KEY = "elite_gym_v1_pos_sales";

export function loadPosProducts(): PosProduct[] {
  return loadJson<PosProduct[]>(PRODUCTS_KEY, []);
}

export function savePosProducts(products: PosProduct[]): void {
  saveJson(PRODUCTS_KEY, products);
}

export function loadPosSales(): PosSale[] {
  return loadJson<PosSale[]>(SALES_KEY, []);
}

export function savePosSales(sales: PosSale[]): void {
  saveJson(SALES_KEY, sales);
}

export function clearPosLocalData(): void {
  savePosProducts([]);
  savePosSales([]);
}
