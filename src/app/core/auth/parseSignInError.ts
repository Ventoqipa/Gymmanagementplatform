import { CORS_USER_MESSAGE, isLikelyCorsOrNetworkBlock } from "../../config/corsHint";
import type { AspNetValidationError, TanosiApiResponse } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTanosiEnvelope(
  value: unknown,
): value is TanosiApiResponse<unknown> {
  return (
    isRecord(value) &&
    "isResponseSuccessful" in value &&
    ("messageUser" in value || "messageTechnical" in value)
  );
}

function isAspNetValidation(value: unknown): value is AspNetValidationError {
  return isRecord(value) && "errors" in value && isRecord(value.errors);
}

function flattenValidationErrors(errors: Record<string, string[]>): string {
  return Object.values(errors)
    .flat()
    .map((m) => m.trim())
    .filter(Boolean)
    .join(" ");
}

/** Extrae un mensaje legible desde el cuerpo de error del API. */
export function parseSignInErrorBody(
  httpStatus: number,
  body: unknown,
): string {
  if (isTanosiEnvelope(body)) {
    const userMsg = body.messageUser?.trim();
    const techMsg = body.messageTechnical?.trim();
    if (userMsg) return userMsg;
    if (techMsg) return techMsg;
    if (!body.isResponseSuccessful) {
      return "No se pudo iniciar sesión.";
    }
  }

  if (isAspNetValidation(body)) {
    if (body.errors) {
      const joined = flattenValidationErrors(body.errors);
      if (joined) return joined;
    }
    if (body.title?.trim()) return body.title.trim();
  }

  if (isRecord(body)) {
    const detail = body.detail ?? body.message;
    if (typeof detail === "string" && detail.trim()) return detail.trim();
  }

  if (httpStatus === 400) return "Solicitud inválida. Verifique los datos ingresados.";
  if (httpStatus === 401 || httpStatus === 403) return "Credenciales no válidas.";
  if (httpStatus === 409) return "No se pudo iniciar sesión.";
  if (httpStatus >= 500) return "Error del servidor. Intente más tarde.";

  return "No se pudo iniciar sesión.";
}

export function parseNetworkError(error: unknown): string {
  if (isLikelyCorsOrNetworkBlock(error)) {
    return CORS_USER_MESSAGE;
  }
  if (error instanceof TypeError) {
    return "No hay conexión con el servidor de seguridad.";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Error de red al iniciar sesión.";
}
