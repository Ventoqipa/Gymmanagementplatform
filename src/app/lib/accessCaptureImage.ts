/** Miniatura local (data URL) para demo; en producción usar URL del Access Gateway. */

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function buildAccessCaptureDataUrl(
  name: string,
  options?: { granted?: boolean },
): string {
  const granted = options?.granted !== false;
  const bg = granted ? "#2a2a2a" : "#1a1010";
  const ring = granted ? "#00ff00" : "#e31e24";
  const label = escapeXml(initialsFromName(name));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
  <rect width="320" height="320" fill="${bg}"/>
  <circle cx="160" cy="128" r="72" fill="#3d3d3d"/>
  <circle cx="160" cy="128" r="70" fill="none" stroke="${ring}" stroke-width="4"/>
  <ellipse cx="160" cy="268" rx="96" ry="72" fill="#3d3d3d"/>
  <text x="160" y="138" text-anchor="middle" font-family="system-ui,sans-serif" font-size="42" font-weight="700" fill="#e5e2e1">${label}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function buildUnknownCaptureDataUrl(): string {
  return buildAccessCaptureDataUrl("?", { granted: false });
}
