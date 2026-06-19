import { CORS_USER_MESSAGE, isLikelyCorsOrNetworkBlock } from "../../config/corsHint";
import type { CatalogApiResponse } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCatalogEnvelope(value: unknown): value is CatalogApiResponse {
  return isRecord(value) && "isResponseSuccessful" in value;
}

function flattenAspNetErrors(errors: Record<string, string[]>): string {
  return Object.values(errors)
    .flat()
    .map((m) => m.trim())
    .filter(Boolean)
    .join(" ");
}

export function parseCatalogErrorBody(httpStatus: number, body: unknown): string {
  if (isCatalogEnvelope(body)) {
    const userMsg = body.messageUser?.trim();
    const techMsg = body.messageTechnical?.trim();
    if (userMsg) return userMsg;
    if (techMsg) return techMsg;
    if (!body.isResponseSuccessful) return "No se pudo completar la operación.";
  }

  if (isRecord(body) && "errors" in body && isRecord(body.errors)) {
    const joined = flattenAspNetErrors(body.errors as Record<string, string[]>);
    if (joined) return joined;
    if (typeof body.title === "string" && body.title.trim()) return body.title.trim();
  }

  if (isRecord(body)) {
    const detail = body.detail ?? body.message;
    if (typeof detail === "string" && detail.trim()) return detail.trim();
  }

  if (httpStatus === 401 || httpStatus === 403) {
    return "Sesión expirada o no autorizada. Vuelva a iniciar sesión.";
  }
  if (httpStatus === 400) return "Datos inválidos. Verifique la información.";
  if (httpStatus >= 500) return "El servicio no está disponible. Intente más tarde.";

  return "No se pudo completar la operación.";
}

export function parseCatalogNetworkError(error: unknown): string {
  if (isLikelyCorsOrNetworkBlock(error)) return CORS_USER_MESSAGE;
  if (error instanceof TypeError) return "No hay conexión con el servidor.";
  if (error instanceof Error && error.message) return error.message;
  return "Error de conexión.";
}
