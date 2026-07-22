/**
 * Documentos e imágenes de identificación (DocsEG).
 *
 * El navegador solo ve la ruta relativa `/docs-api` (mismo origen).
 * Usuario/contraseña viven en `.env` sin prefijo VITE_ y los inyecta el
 * proxy (Vite en dev, api-proxy.php en Neubox) — no van al bundle.
 *
 * PRUEBA:  https://docs.tanosi.com.mx/eg/docs/test/{DocFileName}
 * PROD:    https://docs.tanosi.com.mx/eg/docs/{DocFileName}
 */
export const docsConfig = {
  /** Ruta pública (proxy) o URL absoluta si se define. */
  baseUrl: (import.meta.env.VITE_DOCS_BASE_URL ?? "/docs-api").replace(
    /\/$/,
    "",
  ),
  /**
   * Bypass de entorno de prueba: si true, usa `/eg/docs/test`.
   * Pon `VITE_DOCS_USE_TEST=false` (o quítalo) cuando no sea test.
   */
  useTestPath: import.meta.env.VITE_DOCS_USE_TEST !== "false",
  pathPrefixTest: "/eg/docs/test",
  pathPrefixProd: "/eg/docs",
} as const;

export function docsPathPrefix(): string {
  return docsConfig.useTestPath
    ? docsConfig.pathPrefixTest
    : docsConfig.pathPrefixProd;
}
