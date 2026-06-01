/** Configuración del API de seguridad Tanosi (variables Vite). */

const securityApiBaseUrl =
  import.meta.env.VITE_SECURITY_API_URL ??
  "https://apisecuritygetest.tanosi.com.mx";

export const securityConfig = {
  apiBaseUrl: securityApiBaseUrl.replace(/\/$/, ""),
  signInPath: "/api/ge/Security/Access/SignIn",
  appId: Number(import.meta.env.VITE_APP_ID ?? "5"),
  typeAccess: (import.meta.env.VITE_TYPE_ACCESS ?? "W").trim(),
} as const;

export function getSignInUrl(): string {
  return `${securityConfig.apiBaseUrl}${securityConfig.signInPath}`;
}
