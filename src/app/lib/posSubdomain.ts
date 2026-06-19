/** Utilidades del subdominio POS dentro del mismo proyecto React. */

const POS_HOST_MARKER = ".pos.";

export function isPosSubdomain(hostname = window.location.hostname): boolean {
  return hostname.toLowerCase().includes(POS_HOST_MARKER);
}

/** Ruta por defecto al abrir el subdominio POS. */
export const POS_SUBDOMAIN_HOME = "/pos";

export function shouldRedirectToPosHome(pathname: string): boolean {
  return pathname === "/" || pathname === "";
}
