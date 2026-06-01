import { getAuthToken } from "@/app/core/auth/authStorage";
import { posConfig, getPosApiUrl } from "../config";
import { parseNetworkError, parsePosApiError } from "./parsePosApiError";
import type { TanosiPosEnvelope } from "../domain/types";

export class PosApiError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "PosApiError";
    this.statusCode = statusCode;
  }
}

function buildHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Tenant-Id": posConfig.tenantId,
    "X-Branch-Id": String(posConfig.branchId),
  };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
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

export async function posGet<T>(path: string, query?: Record<string, string>): Promise<T> {
  const url = new URL(getPosApiUrl(path));
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    });
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: buildHeaders(),
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

export async function posPost<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(getPosApiUrl(path), {
      method: "POST",
      headers: buildHeaders(),
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

export async function posPut<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(getPosApiUrl(path), {
      method: "PUT",
      headers: buildHeaders(),
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

export async function posDelete(path: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(getPosApiUrl(path), {
      method: "DELETE",
      headers: buildHeaders(),
    });
  } catch (error) {
    throw new PosApiError(parseNetworkError(error), 0);
  }

  if (!response.ok) {
    const payload = await parseJsonSafe(response);
    throw new PosApiError(parsePosApiError(response.status, payload), response.status);
  }
}
