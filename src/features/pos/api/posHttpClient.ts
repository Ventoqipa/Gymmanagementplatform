import { buildPosApiUrl } from "../config/buildApiUrl";
import type { PosConfig } from "../config/types";
import type { TanosiPosEnvelope } from "../domain/types";
import { parseNetworkError, parsePosApiError } from "./parsePosApiError";

export class PosApiError extends Error {
  readonly statusCode: number;
  /** NUEVO: errorNumber del POS API (p. ej. 24/25 en renovaciones) */
  readonly errorNumber: number | null;
  /** NUEVO: data que acompaña al error (p. ej. saleId de un cobro pendiente) */
  readonly data: unknown;

  constructor(
    message: string,
    statusCode: number,
    errorNumber: number | null = null,
    data: unknown = null,
  ) {
    super(message);
    this.name = "PosApiError";
    this.statusCode = statusCode;
    this.errorNumber = errorNumber;
    this.data = data;
  }
}

/** NUEVO: saca errorNumber y data de la respuesta de error, si vienen */
function extractErrorDetails(payload: unknown): {
  errorNumber: number | null;
  data: unknown;
} {
  if (!payload || typeof payload !== "object") {
    return { errorNumber: null, data: null };
  }
  const p = payload as Record<string, unknown>;
  const raw = p.errorNumber;
  const errorNumber =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim() !== "" && !Number.isNaN(Number(raw))
        ? Number(raw)
        : null;
  return { errorNumber, data: p.data ?? null };
}

/** NUEVO: crea el error con todos los datos de la respuesta */
function buildApiError(statusCode: number, payload: unknown): PosApiError {
  const { errorNumber, data } = extractErrorDetails(payload);
  return new PosApiError(
    parsePosApiError(statusCode, payload),
    statusCode,
    errorNumber,
    data,
  );
}

function buildHeaders(config: PosConfig): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Tenant-Id": config.tenantId,
    "X-Branch-Id": String(config.branchId),
  };
  const apiKey = config.apiKey?.trim();
  if (apiKey) {
    headers["X-Api-Key"] = apiKey;
  } else {
    const token = config.getAuthToken?.()?.trim();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
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

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "isResponseSuccessful" in payload) {
    const envelope = payload as TanosiPosEnvelope<T>;
    if (!envelope.isResponseSuccessful || envelope.statusCode >= 400) {
      throw buildApiError(envelope.statusCode, envelope); // CAMBIO
    }
    return envelope.data;
  }
  return payload as T;
}

function appendQuery(url: string, query?: Record<string, string>): string {
  if (!query) return url;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== "") params.set(k, v);
  });
  const qs = params.toString();
  if (!qs) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${qs}`;
}

export async function posGet<T>(
  config: PosConfig,
  path: string,
  query?: Record<string, string>,
): Promise<T> {
  const url = appendQuery(buildPosApiUrl(config, path), query);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: buildHeaders(config),
    });
  } catch (error) {
    throw new PosApiError(parseNetworkError(error), 0);
  }

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw buildApiError(response.status, payload); // CAMBIO
  }
  return unwrapData<T>(payload);
}

export async function posPost<T>(
  config: PosConfig,
  path: string,
  body: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildPosApiUrl(config, path), {
      method: "POST",
      headers: buildHeaders(config),
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new PosApiError(parseNetworkError(error), 0);
  }

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw buildApiError(response.status, payload); // CAMBIO
  }
  return unwrapData<T>(payload);
}

export async function posPut<T>(
  config: PosConfig,
  path: string,
  body: unknown,
): Promise<T> {
  let response: Response;
  try {
    // IIS/Neubox bloquea PUT; POST a la misma ruta lo acepta el router PHP.
    response = await fetch(buildPosApiUrl(config, path), {
      method: "POST",
      headers: buildHeaders(config),
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new PosApiError(parseNetworkError(error), 0);
  }

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw buildApiError(response.status, payload); // CAMBIO
  }
  return unwrapData<T>(payload);
}

export async function posDelete(config: PosConfig, path: string): Promise<void> {
  let response: Response;
  try {
    // IIS/Neubox bloquea DELETE; POST a /products/{id}/delete
    response = await fetch(buildPosApiUrl(config, path), {
      method: "POST",
      headers: buildHeaders(config),
    });
  } catch (error) {
    throw new PosApiError(parseNetworkError(error), 0);
  }

  if (!response.ok) {
    const payload = await parseJsonSafe(response);
    throw buildApiError(response.status, payload); // CAMBIO
  }
}