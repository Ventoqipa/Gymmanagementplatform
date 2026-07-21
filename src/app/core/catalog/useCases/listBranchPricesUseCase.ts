import { getBranchId } from "../../auth/authStorage";
import { CatalogApiError } from "../catalogApiClient";
import { fetchPricesByBranch } from "../priceApi";
import type { CatalogBranchPrice } from "../types";

export type ListBranchPricesResult =
  | { ok: true; prices: CatalogBranchPrice[] }
  | { ok: false; message: string; statusCode?: number };

export async function listBranchPricesUseCase(): Promise<ListBranchPricesResult> {
  const branchId = getBranchId();
  if (!branchId) {
    return {
      ok: false,
      message: "Sesión incompleta. Vuelva a iniciar sesión.",
    };
  }

  try {
    const prices = await fetchPricesByBranch(branchId);
    return { ok: true, prices };
  } catch (error) {
    if (error instanceof CatalogApiError) {
      return { ok: false, message: error.message, statusCode: error.statusCode };
    }
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los precios de la sucursal.",
    };
  }
}
