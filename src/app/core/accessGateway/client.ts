import {
  accessGatewayConfig,
  accessGatewayUrl,
  isAccessGatewayConfigured,
} from "../../config/accessGateway";
import {
  buildEnrollPayload,
  type AccessGatewayEvent,
  type FaceIdEnrollErrorBody,
  type FaceIdEnrollRequest,
  type FaceIdEnrollResponse,
  type FaceIdVerifyRequest,
  type FaceIdVerifyResponse,
  type TurnstileCommandRequest,
  type TurnstileCommandResponse,
} from "./types";

export class AccessGatewayError extends Error {
  readonly code: FaceIdEnrollErrorBody["code"];
  readonly statusCode: number;
  readonly vendorRequestId?: string;
  readonly terminalId?: string;

  constructor(
    message: string,
    options: {
      code: FaceIdEnrollErrorBody["code"];
      statusCode: number;
      vendorRequestId?: string;
      terminalId?: string;
    },
  ) {
    super(message);
    this.name = "AccessGatewayError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.vendorRequestId = options.vendorRequestId;
    this.terminalId = options.terminalId;
  }
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/**
 * Enrolamiento Face ID vía Access Gateway (ADMS → SpeedFace).
 * Requiere VITE_ACCESS_GATEWAY_URL o localStorage elite_access_gateway_url.
 */
export async function enrollFaceId(
  input: FaceIdEnrollRequest,
): Promise<FaceIdEnrollResponse> {
  const payload = buildEnrollPayload(input);

  if (!isAccessGatewayConfigured()) {
    throw new AccessGatewayError(
      "Access Gateway no configurado. Defina elite_access_gateway_url o VITE_ACCESS_GATEWAY_URL.",
      { code: "NETWORK", statusCode: 0, terminalId: payload.terminalId },
    );
  }

  let response: Response;
  try {
    response = await fetch(accessGatewayUrl(accessGatewayConfig.enrollPath), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new AccessGatewayError(
      error instanceof Error ? error.message : "Sin conexión al Access Gateway.",
      { code: "NETWORK", statusCode: 0, terminalId: payload.terminalId },
    );
  }

  const body = await parseJsonSafe(response);

  if (!response.ok) {
    const err = (body ?? {}) as Partial<FaceIdEnrollErrorBody>;
    throw new AccessGatewayError(
      err.message || `Enrolamiento falló (HTTP ${response.status}).`,
      {
        code: err.code ?? "UNKNOWN",
        statusCode: response.status,
        vendorRequestId: err.vendorRequestId,
        terminalId: err.terminalId ?? payload.terminalId,
      },
    );
  }

  const data = body as Partial<FaceIdEnrollResponse> | null;
  if (!data?.templateId) {
    throw new AccessGatewayError("Respuesta de enroll sin templateId.", {
      code: "UNKNOWN",
      statusCode: response.status,
      terminalId: payload.terminalId,
    });
  }

  if (
    typeof data.qualityScore === "number" &&
    data.qualityScore < accessGatewayConfig.minQualityScore
  ) {
    throw new AccessGatewayError(
      `Calidad insuficiente (${data.qualityScore}). Mínimo ${accessGatewayConfig.minQualityScore}.`,
      {
        code: "LOW_QUALITY",
        statusCode: 422,
        vendorRequestId: data.vendorRequestId,
        terminalId: payload.terminalId,
      },
    );
  }

  return {
    ok: true,
    templateId: data.templateId,
    vendorRequestId: data.vendorRequestId ?? `enroll_${Date.now()}`,
    qualityScore: data.qualityScore ?? 0,
    latencyMs: data.latencyMs ?? 0,
    terminalId: data.terminalId ?? payload.terminalId,
    deviceSerial: data.deviceSerial,
    pin: data.pin ?? payload.pin,
    enrolledAtIso: data.enrolledAtIso ?? new Date().toISOString(),
  };
}

/** Verify: Gateway real o mock. */
export async function verifyFaceId(
  input: FaceIdVerifyRequest,
): Promise<FaceIdVerifyResponse> {
  if (!isAccessGatewayConfigured()) {
    throw new AccessGatewayError(
      "Access Gateway no configurado. Defina elite_access_gateway_url o VITE_ACCESS_GATEWAY_URL.",
      { code: "NETWORK", statusCode: 0, terminalId: input.terminalId },
    );
  }
  let response: Response;
  try {
    response = await fetch(accessGatewayUrl(accessGatewayConfig.verifyPath), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...input,
        timeoutSeconds: input.timeoutSeconds ?? 45,
      }),
    });
  } catch (error) {
    throw new AccessGatewayError(
      error instanceof Error ? error.message : "Sin conexión al Access Gateway.",
      { code: "NETWORK", statusCode: 0, terminalId: input.terminalId },
    );
  }
  const body = await parseJsonSafe(response);
  if (!response.ok) {
    const err = (body ?? {}) as Partial<FaceIdEnrollErrorBody>;
    throw new AccessGatewayError(
      err.message || `Verify falló (HTTP ${response.status}).`,
      {
        code: err.code ?? "UNKNOWN",
        statusCode: response.status,
        terminalId: input.terminalId,
      },
    );
  }
  return body as FaceIdVerifyResponse;
}

/** Comando torniquete vía Access Gateway (ADMS / Wiegand local). */
export async function turnstileCommand(
  input: TurnstileCommandRequest,
): Promise<TurnstileCommandResponse> {
  if (!isAccessGatewayConfigured()) {
    throw new AccessGatewayError(
      "Access Gateway no configurado. Defina elite_access_gateway_url o VITE_ACCESS_GATEWAY_URL.",
      { code: "NETWORK", statusCode: 0, terminalId: input.terminalId },
    );
  }
  let response: Response;
  try {
    response = await fetch(
      accessGatewayUrl(accessGatewayConfig.turnstilePath),
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      },
    );
  } catch (error) {
    throw new AccessGatewayError(
      error instanceof Error ? error.message : "Sin conexión al Access Gateway.",
      { code: "NETWORK", statusCode: 0, terminalId: input.terminalId },
    );
  }
  const body = await parseJsonSafe(response);
  if (!response.ok) {
    throw new AccessGatewayError(
      `Comando torniquete falló (HTTP ${response.status}).`,
      { code: "UNKNOWN", statusCode: response.status, terminalId: input.terminalId },
    );
  }
  return body as TurnstileCommandResponse;
}

/** Muro de accesos (eventos ADMS). */
export async function fetchAccessEvents(options?: {
  since?: string;
  limit?: number;
}): Promise<AccessGatewayEvent[]> {
  if (!isAccessGatewayConfigured()) return [];

  const params = new URLSearchParams();
  if (options?.since) params.set("since", options.since);
  if (options?.limit) params.set("limit", String(options.limit));
  const qs = params.toString();
  const path = `${accessGatewayConfig.eventsPath}${qs ? `?${qs}` : ""}`;

  let response: Response;
  try {
    response = await fetch(accessGatewayUrl(path), {
      method: "GET",
      headers: { Accept: "application/json" },
    });
  } catch {
    return [];
  }
  if (!response.ok) return [];
  const body = (await parseJsonSafe(response)) as {
    events?: AccessGatewayEvent[];
  } | null;
  return Array.isArray(body?.events) ? body.events : [];
}

export async function pingAccessGateway(): Promise<{
  ok: boolean;
  simulateAccess?: boolean;
  note?: string;
  mode?: string;
  terminals?: Array<{
    terminalId: string;
    serial?: string;
    online?: boolean;
    lastSeenIso?: string | null;
  }>;
}> {
  if (!isAccessGatewayConfigured()) {
    return { ok: false, note: "Gateway no configurado." };
  }
  try {
    const response = await fetch(accessGatewayUrl("/health"), {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const body = (await parseJsonSafe(response)) as {
      ok?: boolean;
      simulateAccess?: boolean;
      note?: string;
      mode?: string;
      terminals?: Array<{
        terminalId: string;
        serial?: string;
        online?: boolean;
        lastSeenIso?: string | null;
      }>;
    } | null;
    return {
      ok: Boolean(response.ok && body?.ok),
      simulateAccess: body?.simulateAccess,
      note: body?.note,
      mode: body?.mode,
      terminals: body?.terminals,
    };
  } catch {
    return { ok: false, note: "Sin conexión al Gateway." };
  }
}

export type GatewayActivityRow = {
  id: string;
  atIso: string;
  message: string;
  serial?: string;
  kind?: string;
};

export type GatewayDiagnostics = {
  ok: boolean;
  atIso?: string;
  startedAtIso?: string;
  hostname?: string;
  platform?: string;
  admsPort?: number;
  elitePort?: number;
  lanIps?: Array<{ name: string; address: string }>;
  suggestedAdmsUrl?: string;
  suggestedEliteUrl?: string;
  terminals?: Array<{
    terminalId: string;
    serial?: string;
    label?: string;
    online?: boolean;
    lastSeenIso?: string | null;
  }>;
  devicesOnline?: number;
  eventsCount?: number;
  pendingEnrolls?: number;
  activityRecent?: GatewayActivityRow[];
  netstat?: string | null;
  netstatError?: string | null;
  setupHints?: string[];
};

export async function fetchGatewayActivity(limit = 40): Promise<GatewayActivityRow[]> {
  if (!isAccessGatewayConfigured()) return [];
  try {
    const response = await fetch(
      accessGatewayUrl(
        `${accessGatewayConfig.activityPath}?limit=${Math.min(80, limit)}`,
      ),
      { method: "GET", headers: { Accept: "application/json" } },
    );
    if (!response.ok) return [];
    const body = (await parseJsonSafe(response)) as {
      activity?: GatewayActivityRow[];
    } | null;
    return Array.isArray(body?.activity) ? body.activity : [];
  } catch {
    return [];
  }
}

export async function fetchGatewayDiagnostics(options?: {
  netstat?: boolean;
}): Promise<GatewayDiagnostics | null> {
  if (!isAccessGatewayConfigured()) return null;
  try {
    const qs = options?.netstat ? "?netstat=1" : "";
    const response = await fetch(
      accessGatewayUrl(`${accessGatewayConfig.diagnosticsPath}${qs}`),
      { method: "GET", headers: { Accept: "application/json" } },
    );
    if (!response.ok) return null;
    return (await parseJsonSafe(response)) as GatewayDiagnostics;
  } catch {
    return null;
  }
}

/** Ejecuta el equivalente de check-ports.bat en el PC del Gateway. */
export async function runGatewayDiagnostics(): Promise<GatewayDiagnostics | null> {
  if (!isAccessGatewayConfigured()) return null;
  try {
    const response = await fetch(
      accessGatewayUrl(accessGatewayConfig.diagnosticsRunPath),
      { method: "POST", headers: { Accept: "application/json" } },
    );
    if (!response.ok) return null;
    return (await parseJsonSafe(response)) as GatewayDiagnostics;
  } catch {
    return null;
  }
}

export type GatewayReconnectResult = {
  ok: boolean;
  message: string;
  eliteConnected?: boolean;
  admsListening?: boolean;
  devicesOnline?: number;
  admsPort?: number;
  elitePort?: number;
  suggestedAdmsUrl?: string;
  terminals?: GatewayDiagnostics["terminals"];
};

/**
 * Guarda la URL del Gateway (si se pasa) y reconecta Elite → Access Gateway / ADMS.
 * No arranca start-gateway.bat; requiere el proceso ya en ejecución.
 */
export async function reconnectEliteToGateway(
  urlOverride?: string,
): Promise<GatewayReconnectResult> {
  const raw = (urlOverride ?? accessGatewayConfig.baseUrl).trim().replace(/\/$/, "");
  if (!raw) {
    return {
      ok: false,
      message: "Indique la URL del Gateway (ej. http://127.0.0.1:8787).",
    };
  }

  setAccessGatewayRuntimeUrl(raw);

  let healthOk = false;
  try {
    const healthRes = await fetch(`${raw}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const healthBody = (await parseJsonSafe(healthRes)) as { ok?: boolean } | null;
    healthOk = Boolean(healthRes.ok && healthBody?.ok);
  } catch {
    return {
      ok: false,
      message:
        "No hay respuesta del Gateway. En el PC del gym ejecute start-gateway.bat y deje la ventana abierta.",
    };
  }

  if (!healthOk) {
    return {
      ok: false,
      message: "El Gateway respondió, pero /health no está OK. Revise start-gateway.bat.",
    };
  }

  try {
    const response = await fetch(`${raw}${accessGatewayConfig.reconnectPath}`, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    const body = (await parseJsonSafe(response)) as Partial<GatewayReconnectResult> | null;
    if (!response.ok || !body?.ok) {
      return {
        ok: false,
        message:
          (body as { message?: string } | null)?.message ||
          `Reconexión falló (HTTP ${response.status}).`,
      };
    }
    return {
      ok: true,
      eliteConnected: true,
      admsListening: body.admsListening ?? true,
      devicesOnline: body.devicesOnline,
      admsPort: body.admsPort,
      elitePort: body.elitePort,
      suggestedAdmsUrl: body.suggestedAdmsUrl,
      terminals: body.terminals,
      message:
        body.message ||
        "Elite reconectado al Access Gateway / ADMS.",
    };
  } catch {
    return {
      ok: false,
      message: "Gateway online, pero falló POST /v1/reconnect. Reinicie el Gateway.",
    };
  }
}
