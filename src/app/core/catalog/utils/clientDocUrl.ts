import { docsConfig, docsPathPrefix } from "../../../config/docs";

/** Normaliza DocFileName del catálogo (quita "-" / vacíos / prefijos absolutos). */
export function normalizeDocFileName(
  raw: string | null | undefined,
): string | null {
  const value = raw?.trim();
  if (!value || value === "-" || value.toLowerCase() === "null") return null;
  // Si el API devolviera una URL completa, conserva solo el path relativo.
  try {
    if (/^https?:\/\//i.test(value)) {
      const u = new URL(value);
      const marker = u.pathname.includes("/eg/docs/")
        ? u.pathname.replace(/^.*?\/eg\/docs(?:\/test)?\/?/i, "")
        : u.pathname.replace(/^\//, "");
      return marker || null;
    }
  } catch {
    /* ignore */
  }
  return value.replace(/^\/+/, "");
}

/**
 * URL misma-origen para `<img src>` / `<a href>`:
 * `/docs-api/eg/docs/test/{DocFileName}` (test) o sin `/test` (prod).
 * El proxy añade Basic Auth; el front no conoce usuario/contraseña.
 */
export function buildClientDocumentUrl(
  docFileName: string | null | undefined,
): string | undefined {
  const file = normalizeDocFileName(docFileName);
  if (!file) return undefined;
  const segments = file.split("/").filter(Boolean).map(encodeURIComponent);
  return `${docsConfig.baseUrl}${docsPathPrefix()}/${segments.join("/")}`;
}
