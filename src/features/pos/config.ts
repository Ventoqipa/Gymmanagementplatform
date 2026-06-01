/**
 * POS API — Neubox / producción Tanosi.
 * Ejemplo Neubox: https://pos.elitegym247.tanosi.com.mx/api/v1
 */

import { resolveApiBaseUrl } from "@/app/config/apiBaseUrl";

const rawBase = resolveApiBaseUrl({
  envUrl: import.meta.env.VITE_POS_API_BASE_URL,
  devProxyPath: "/pos-api",
  productionDefault: "/pos-api",
});

const apiPrefix = (import.meta.env.VITE_POS_API_PREFIX ?? "/api/v1").replace(
  /\/$/,
  "",
);

export const posConfig = {
  apiBaseUrl: rawBase.replace(/\/$/, ""),
  apiPrefix,
  tenantId: (import.meta.env.VITE_POS_TENANT_ID ?? "elite-gym").trim(),
  /**
   * true = solo memoria (demo sin backend).
   * false = intenta REST; si falla, híbrido usa memoria como respaldo.
   */
  useMock: import.meta.env.VITE_POS_USE_MOCK === "true",
  branchId: Number(import.meta.env.VITE_POS_BRANCH_ID ?? "1") || 1,
} as const;

export function getPosApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${posConfig.apiBaseUrl}${posConfig.apiPrefix}${normalized}`;
}
