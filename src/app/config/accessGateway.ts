/**
 * Config Access Gateway (LAN del gym).
 * Vacío = Elite usa mock de enrolamiento / verify.
 *
 * Override en runtime (pruebas AnyDesk / túnel HTTPS sin rebuild):
 *   localStorage.setItem("elite_access_gateway_url", "https://xxxx.trycloudflare.com")
 *   localStorage.removeItem("elite_access_gateway_url")
 */
const RUNTIME_KEY = "elite_access_gateway_url";

function readRuntimeGatewayUrl(): string {
  try {
    if (typeof localStorage === "undefined") return "";
    return (localStorage.getItem(RUNTIME_KEY) ?? "").trim().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function readBuildGatewayUrl(): string {
  return (import.meta.env.VITE_ACCESS_GATEWAY_URL ?? "").replace(/\/$/, "");
}

export const accessGatewayConfig = {
  enrollPath: "/v1/biometric/enroll",
  verifyPath: "/v1/biometric/verify",
  turnstilePath: "/v1/turnstile/command",
  /** Calidad mínima sugerida (0–1). */
  minQualityScore: 0.85,
  get baseUrl(): string {
    return readRuntimeGatewayUrl() || readBuildGatewayUrl();
  },
} as const;

export function isAccessGatewayConfigured(): boolean {
  return Boolean(accessGatewayConfig.baseUrl);
}

export function accessGatewayUrl(path: string): string {
  const base = accessGatewayConfig.baseUrl;
  if (!base) {
    throw new Error("VITE_ACCESS_GATEWAY_URL no está configurada.");
  }
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Solo para pruebas: apunta el cliente al Gateway sin redeploy. */
export function setAccessGatewayRuntimeUrl(url: string | null): void {
  try {
    if (!url?.trim()) {
      localStorage.removeItem(RUNTIME_KEY);
      return;
    }
    localStorage.setItem(RUNTIME_KEY, url.trim().replace(/\/$/, ""));
  } catch {
    /* ignore */
  }
}
