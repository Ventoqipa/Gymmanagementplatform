import { getAuthToken } from "../auth/authStorage";
import {
  parseCatalogErrorBody,
  parseCatalogNetworkError,
} from "./parseCatalogError";
import type { CatalogApiResponse } from "./types";

export class CatalogApiError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "CatalogApiError";
    this.statusCode = statusCode;
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

export type CatalogRequestOptions = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  url: string;
  body?: unknown;
};

/**
 * IIS/Neubox (StaticFile/WebDAV) suele responder 405 a PUT/DELETE.
 * En esas rutas usamos POST + X-HTTP-Method-Override; el proxy PHP
 * reenvía el verbo real al API Tanosi.
 */
function resolveCatalogFetch(
  method: CatalogRequestOptions["method"],
): { fetchMethod: "GET" | "POST"; override?: "PUT" | "DELETE" } {
  if (method === "PUT" || method === "DELETE") {
    return { fetchMethod: "POST", override: method };
  }
  return { fetchMethod: method };
}

export async function catalogRequest<T>(options: CatalogRequestOptions): Promise<T> {
  const token = getAuthToken();
  if (!token?.trim()) {
    throw new CatalogApiError("No hay sesión activa. Inicie sesión nuevamente.", 401);
  }

  const { fetchMethod, override } = resolveCatalogFetch(options.method);

  const headers: Record<string, string> = {
    Accept: "*/*",
    Authorization: `Bearer ${token.trim()}`,
  };
  if (override) {
    headers["X-HTTP-Method-Override"] = override;
  }

  let response: Response;
  try {
    response = await fetch(options.url, {
      method: fetchMethod,
      headers:
        options.body !== undefined
          ? { ...headers, "Content-Type": "application/json" }
          : headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    throw new CatalogApiError(parseCatalogNetworkError(error), 0);
  }

  const payload = await parseJsonSafe(response);

  if (!response.ok) {
    throw new CatalogApiError(
      parseCatalogErrorBody(response.status, payload),
      response.status,
    );
  }

  if (payload && typeof payload === "object" && "isResponseSuccessful" in payload) {
    const envelope = payload as CatalogApiResponse<T>;
    if (!envelope.isResponseSuccessful || envelope.statusCode >= 400) {
      throw new CatalogApiError(
        parseCatalogErrorBody(envelope.statusCode, envelope),
        envelope.statusCode,
      );
    }
    return envelope.data;
  }

  return payload as T;
}
