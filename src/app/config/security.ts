/** Configuración del API de seguridad Tanosi (variables Vite). */

import { resolveApiBaseUrl } from "./apiBaseUrl";

const securityApiBaseUrl = resolveApiBaseUrl({
  envUrl: import.meta.env.VITE_SECURITY_API_URL,
  devProxyPath: "/security-api",
  productionDefault: "/security-api",
});

export const securityConfig = {
  apiBaseUrl: securityApiBaseUrl,
  signInPath: "/api/eg/Security/Access/SignIn",
  appId: Number(import.meta.env.VITE_APP_ID ?? "5"),
  typeAccess: (import.meta.env.VITE_TYPE_ACCESS ?? "W").trim(),
  /** Si está definida, se envía en SignIn en lugar de detectar IP pública (útil en dev). */
  signInIpAddress: (import.meta.env.VITE_SIGNIN_IP_ADDRESS ?? "").trim(),
} as const;

export function getSignInUrl(): string {
  return `${securityConfig.apiBaseUrl}${securityConfig.signInPath}`;
}
