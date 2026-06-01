/**
 * Resuelve la URL base del API evitando CORS en desarrollo vía proxy de Vite.
 *
 * En .env de desarrollo NO uses URL absoluta al API si el servidor no tiene CORS;
 * deja vacío VITE_*_API_URL o usa la ruta relativa del proxy (/security-api, /pos-api).
 */
export function resolveApiBaseUrl(options: {
  envUrl: string | undefined;
  devProxyPath: string;
  productionDefault: string;
}): string {
  const fromEnv = options.envUrl?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  if (import.meta.env.DEV) {
    return options.devProxyPath;
  }
  return options.productionDefault.replace(/\/$/, "");
}
