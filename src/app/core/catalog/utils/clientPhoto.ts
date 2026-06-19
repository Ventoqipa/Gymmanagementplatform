/** Nombre de archivo ID: {fullName sin espacios}_{timestampIngreso} */
export function buildPhotoClientIdFileName(
  fullName: string,
  enrollmentDateIso: string,
): string {
  const name = fullName.trim().replace(/\s+/g, "");
  const ts = new Date(`${enrollmentDateIso}T12:00:00`).getTime();
  return `${name}_${ts}`;
}

/** Extrae base64 puro de un data URL (jpeg/png). */
export function dataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}
