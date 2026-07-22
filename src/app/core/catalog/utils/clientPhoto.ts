/** Nombre de archivo ID: {fullName sin espacios}_{timestampIngreso} */
export function buildPhotoClientIdFileName(
  fullName: string,
  enrollmentDateIso: string,
): string {
  const name = fullName.trim().replace(/\s+/g, "");
  const ts = new Date(`${enrollmentDateIso}T12:00:00`).getTime();
  return `${name}_${ts}`;
}

/** Extrae base64 puro de un data URL. */
export function dataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/bmp": ".bmp",
  "image/svg+xml": ".svg",
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "application/zip": ".zip",
  "application/x-zip-compressed": ".zip",
};

/** Extensión a partir del data URL (cualquier mime). */
export function dataUrlToExtension(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;,]+)/i);
  if (!match) return ".bin";
  const mime = match[1].toLowerCase();
  if (MIME_TO_EXT[mime]) return MIME_TO_EXT[mime];
  if (mime.startsWith("image/")) {
    const subtype = mime.slice("image/".length).toLowerCase();
    return `.${subtype === "jpeg" ? "jpg" : subtype || "png"}`;
  }
  const subtype = mime.split("/")[1]?.replace(/[^a-z0-9]+/gi, "") || "bin";
  return `.${subtype}`;
}

export function mimeFromDataUrl(dataUrl: string): string | null {
  const match = dataUrl.match(/^data:([^;,]+)/i);
  return match ? match[1].toLowerCase() : null;
}

export type DocumentPreviewKind = "image" | "pdf" | "other";

export function extensionFromFileName(fileName: string | null | undefined): string {
  const base = fileName?.split("/").pop()?.trim() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot < 0) return "";
  return base.slice(dot).toLowerCase();
}

export function resolveDocumentPreviewKind(
  src: string | null | undefined,
  fileName?: string | null,
): DocumentPreviewKind {
  if (!src?.trim()) return "other";
  const mime = src.startsWith("data:") ? mimeFromDataUrl(src) : null;
  if (mime?.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";

  const ext =
    extensionFromFileName(fileName) ||
    extensionFromFileName(src.split("?")[0]);
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"].includes(ext)) {
    return "image";
  }
  if (ext === ".pdf") return "pdf";
  return "other";
}
