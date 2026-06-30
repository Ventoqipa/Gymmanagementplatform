import { toast } from "sonner";
import { resolveApiBaseUrl } from "./resolveApiBaseUrl";
import {
  DEFAULT_LABELS,
  DEFAULT_STORAGE_PREFIX,
} from "./defaults";
import type { PosConfig, PosConfigInput, PosDataSource, PosNotifyAdapter } from "./types";

const defaultNotify: PosNotifyAdapter = {
  success: (message, options) => toast.success(message, options),
  error: (message) => toast.error(message),
  info: (message, options) => toast.info(message, options),
};

function parseDataSource(value?: string): PosDataSource {
  const v = value?.trim();
  if (v === "local" || v === "rest" || v === "hybrid") return v;
  return "rest";
}

export function createPosConfig(overrides: PosConfigInput = {}): PosConfig {
  const storagePrefix = overrides.storagePrefix ?? DEFAULT_STORAGE_PREFIX;
  const storageKeys = {
    products: overrides.storageKeys?.products ?? `${storagePrefix}_pos_products`,
    sales: overrides.storageKeys?.sales ?? `${storagePrefix}_pos_sales`,
  };

  const apiBaseUrl = resolveApiBaseUrl({
    envUrl: import.meta.env.VITE_POS_API_BASE_URL,
    devProxyPath: "/pos-api",
    productionDefault: overrides.apiBaseUrl ?? "/pos-api",
  });

  const notify: PosNotifyAdapter = {
    ...defaultNotify,
    ...overrides.notify,
  };

  const labels = {
    ...DEFAULT_LABELS,
    ...overrides.labels,
    productCategories: {
      ...DEFAULT_LABELS.productCategories,
      ...overrides.labels?.productCategories,
    },
    paymentMethods: {
      ...DEFAULT_LABELS.paymentMethods,
      ...overrides.labels?.paymentMethods,
    },
  };

  return {
    storagePrefix,
    storageKeys,
    labels,
    notify,
    defaultProductCategory:
      overrides.defaultProductCategory ?? "SUPPLEMENTS",
    showTaxOnTicket: overrides.showTaxOnTicket ?? false,
    ivaRegimen: overrides.ivaRegimen ?? "sin_iva",
    apiBaseUrl: overrides.apiBaseUrl ?? apiBaseUrl,
    apiPrefix:
      overrides.apiPrefix ??
      (import.meta.env.VITE_POS_API_PREFIX ?? "/api/v1").replace(/\/$/, ""),
    apiKey:
      overrides.apiKey ??
      ((import.meta.env.VITE_POS_API_KEY ?? "").trim() || undefined),
    tenantId:
      overrides.tenantId ??
      (import.meta.env.VITE_POS_TENANT_ID ?? "elite-gym").trim(),
    branchId:
      overrides.branchId ??
      (Number(import.meta.env.VITE_POS_BRANCH_ID ?? "1") || 1),
    dataSource: overrides.dataSource ?? parseDataSource(import.meta.env.VITE_POS_DATA_SOURCE),
    useMock: overrides.useMock ?? import.meta.env.VITE_POS_USE_MOCK === "true",
    getAuthToken: overrides.getAuthToken,
    onSaleComplete: overrides.onSaleComplete,
    confirmDelete:
      overrides.confirmDelete ??
      ((message) => window.confirm(message)),
    loadCustomers: overrides.loadCustomers,
  };
}

/** Config singleton para Elite Gym — usar en el host. */
export const eliteGymPosConfig = createPosConfig();
