import { securityConfig } from "../../config/security";
import { getClientIpAddress, isValidIpv4 } from "./getClientIpAddress";

export type ResolveSignInIpResult =
  | { ok: true; ipAddress: string; source: "env" | "detected" }
  | { ok: false; message: string };

/** IP para SignIn: .env → detección pública automática. */
export async function resolveSignInIpAddress(): Promise<ResolveSignInIpResult> {
  const fromEnv = securityConfig.signInIpAddress.trim();
  if (fromEnv && isValidIpv4(fromEnv)) {
    return { ok: true, ipAddress: fromEnv, source: "env" };
  }

  const detected = (await getClientIpAddress()).trim();
  if (detected && isValidIpv4(detected)) {
    return { ok: true, ipAddress: detected, source: "detected" };
  }

  return {
    ok: false,
    message:
      "No se pudo detectar tu IP. Define VITE_SIGNIN_IP_ADDRESS en .env con la IP autorizada en Tanosi.",
  };
}
