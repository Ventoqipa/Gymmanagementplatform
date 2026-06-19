import type { PosConfig } from "./types";

export function buildPosApiUrl(config: PosConfig, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${config.apiBaseUrl.replace(/\/$/, "")}${config.apiPrefix}${normalized}`;
}
