/**
 * Resuelve URL base del API POS (proxy en dev, ruta relativa en prod).
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
