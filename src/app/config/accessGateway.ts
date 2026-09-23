/**
 * Config Access Gateway (LAN del gym).
 * Vacío = sin conexión a hardware (enrolamiento / verify requieren Gateway).
 *
 * Override en runtime (PC del gym):
 *   localStorage.setItem("elite_access_gateway_url", "http://127.0.0.1:8787")
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
  eventsPath: "/v1/events",
  eventsStreamPath: "/v1/events/stream",
  activityPath: "/v1/activity",
  diagnosticsPath: "/v1/diagnostics",
  diagnosticsRunPath: "/v1/diagnostics/run",
  reconnectPath: "/v1/reconnect",
  /** Polling del muro de accesos (ms) cuando hay Gateway. */
  eventsPollMs: 2500,
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
