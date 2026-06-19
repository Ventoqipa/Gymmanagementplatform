import type { PosStorageKeys } from "../config/types";
import type { PosProduct, PosSale } from "../domain/types";
import {
  browserLocalStorage,
  loadJson,
  saveJson,
  type StorageAdapter,
} from "./storageAdapter";

export type LocalPosStorage = {
  loadProducts: () => PosProduct[];
  saveProducts: (products: PosProduct[]) => void;
  loadSales: () => PosSale[];
  saveSales: (sales: PosSale[]) => void;
  clear: () => void;
};

export function createLocalPosStorage(
  keys: PosStorageKeys,
  adapter: StorageAdapter = browserLocalStorage,
): LocalPosStorage {
  return {
    loadProducts: () => loadJson<PosProduct[]>(adapter, keys.products, []),
    saveProducts: (products) => saveJson(adapter, keys.products, products),
    loadSales: () => loadJson<PosSale[]>(adapter, keys.sales, []),
    saveSales: (sales) => saveJson(adapter, keys.sales, sales),
    clear: () => {
      saveJson(adapter, keys.products, []);
      saveJson(adapter, keys.sales, []);
    },
  };
}

/** Compatibilidad con imports legacy del host. */
let legacyStorage: LocalPosStorage | null = null;

function getLegacyStorage(): LocalPosStorage {
  if (!legacyStorage) {
    legacyStorage = createLocalPosStorage({
      products: "elite_gym_v1_pos_products",
      sales: "elite_gym_v1_pos_sales",
    });
  }
  return legacyStorage;
}

export function loadPosProducts(): PosProduct[] {
  return getLegacyStorage().loadProducts();
}

export function savePosProducts(products: PosProduct[]): void {
  getLegacyStorage().saveProducts(products);
}

export function loadPosSales(): PosSale[] {
  return getLegacyStorage().loadSales();
}

export function savePosSales(sales: PosSale[]): void {
  getLegacyStorage().saveSales(sales);
}

export function clearPosLocalData(): void {
  getLegacyStorage().clear();
}

export function getPosSalesInRange(
  fromDate: string,
  toDate: string,
  storage?: LocalPosStorage,
): PosSale[] {
  const sales = (storage ?? getLegacyStorage()).loadSales();
  const from = new Date(`${fromDate}T00:00:00`).getTime();
  const to = new Date(`${toDate}T23:59:59.999`).getTime();
  return sales
    .filter((s) => {
      const t = new Date(s.dateIso).getTime();
      return t >= from && t <= to;
    })
    .sort(
      (a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime(),
    );
}
