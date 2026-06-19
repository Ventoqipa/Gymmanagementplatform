import type { TanosiPosEnvelope } from "../domain/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTanosiEnvelope(value: unknown): value is TanosiPosEnvelope<unknown> {
  return isRecord(value) && "isResponseSuccessful" in value;
}

export function parsePosApiError(httpStatus: number, body: unknown): string {
  if (isTanosiEnvelope(body)) {
    if (body.messageUser?.trim()) return body.messageUser.trim();
    if (body.messageTechnical?.trim()) return body.messageTechnical.trim();
    if (!body.isResponseSuccessful) return "Error en el servicio POS.";
  }

  if (isRecord(body) && body.errors && typeof body.errors === "object") {
    const messages = Object.values(body.errors as Record<string, string[]>)
      .flat()
      .filter(Boolean);
    if (messages.length) return messages.join(" ");
  }

  if (isRecord(body) && typeof body.title === "string") return body.title;

  if (httpStatus === 400) return "Solicitud inválida al POS.";
  if (httpStatus === 401 || httpStatus === 403) return "No autorizado en el POS.";
  if (httpStatus >= 500) return "El servidor POS no está disponible.";

  return "Error al comunicarse con el POS.";
}

import { CORS_USER_MESSAGE, isLikelyCorsOrNetworkBlock } from "./networkHint";

export function parseNetworkError(error: unknown): string {
  if (isLikelyCorsOrNetworkBlock(error)) {
    return CORS_USER_MESSAGE;
  }
  if (error instanceof TypeError) {
    return "Sin conexión con el API POS (Neubox).";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Error de red en el POS.";
}
