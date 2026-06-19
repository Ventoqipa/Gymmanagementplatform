import { resolveApiBaseUrl } from "./config/resolveApiBaseUrl";

const rawBase = resolveApiBaseUrl({
  envUrl: import.meta.env.VITE_POS_API_BASE_URL,
  devProxyPath: "/pos-api",
  productionDefault: "/pos-api",
});

const apiPrefix = (import.meta.env.VITE_POS_API_PREFIX ?? "/api/v1").replace(
  /\/$/,
  "",
);

/** @deprecated Usar createPosConfig() — se mantiene por compatibilidad. */
export const posConfig = {
  apiBaseUrl: rawBase.replace(/\/$/, ""),
  apiPrefix,
  tenantId: (import.meta.env.VITE_POS_TENANT_ID ?? "elite-gym").trim(),
  useMock: import.meta.env.VITE_POS_USE_MOCK === "true",
  branchId: Number(import.meta.env.VITE_POS_BRANCH_ID ?? "1") || 1,
} as const;

export function getPosApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${posConfig.apiBaseUrl}${posConfig.apiPrefix}${normalized}`;
}
