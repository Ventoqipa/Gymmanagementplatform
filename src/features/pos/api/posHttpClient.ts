import { buildPosApiUrl } from "../config/buildApiUrl";
import type { PosConfig } from "../config/types";
import type { TanosiPosEnvelope } from "../domain/types";
import { parseNetworkError, parsePosApiError } from "./parsePosApiError";

export class PosApiError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "PosApiError";
    this.statusCode = statusCode;
  }
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
      throw new PosApiError(
        parsePosApiError(envelope.statusCode, envelope),
        envelope.statusCode,
      );
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
    throw new PosApiError(parsePosApiError(response.status, payload), response.status);
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
    throw new PosApiError(parsePosApiError(response.status, payload), response.status);
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
    throw new PosApiError(parsePosApiError(response.status, payload), response.status);
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
    throw new PosApiError(parsePosApiError(response.status, payload), response.status);
  }
}
