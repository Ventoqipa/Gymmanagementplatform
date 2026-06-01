import { securityConfig } from "../../config/security";
import { getClientIpAddress } from "./getClientIpAddress";
import { SecurityApiError, postSignIn } from "./securityApiClient";
import type { SignInSession } from "./types";

export type SignInInput = {
  /** Identificador Hermes del usuario (campo "usuario" en el formulario). */
  hermesID: string;
  userPass: string;
};

export type SignInUseCaseResult =
  | { ok: true; session: SignInSession }
  | { ok: false; message: string; statusCode?: number };

function validateInput(input: SignInInput): string | null {
  const usuario = input.hermesID?.trim() ?? "";
  if (!usuario) {
    return "El usuario es obligatorio.";
  }

  const password = input.userPass ?? "";
  if (!password.trim()) {
    return "La contraseña es obligatoria.";
  }

  if (!securityConfig.typeAccess) {
    return "Tipo de acceso no configurado.";
  }

  if (!Number.isFinite(securityConfig.appId) || securityConfig.appId <= 0) {
    return "Identificador de aplicación no configurado.";
  }

  return null;
}

export async function signInUseCase(
  input: SignInInput,
): Promise<SignInUseCaseResult> {
  const validationError = validateInput(input);
  if (validationError) {
    return { ok: false, message: validationError };
  }

  const ipAddress = (await getClientIpAddress()).trim();
  if (!ipAddress) {
    return { ok: false, message: "No se pudo determinar la dirección IP." };
  }

  try {
    const session = await postSignIn({
      hermesID: input.hermesID.trim(),
      userPass: input.userPass,
      ipAddress,
      typeAccess: securityConfig.typeAccess,
      appID: securityConfig.appId,
    });

    return { ok: true, session };
  } catch (error) {
    if (error instanceof SecurityApiError) {
      return {
        ok: false,
        message: error.message,
        statusCode: error.statusCode,
      };
    }
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Error inesperado al iniciar sesión.",
    };
  }
}
