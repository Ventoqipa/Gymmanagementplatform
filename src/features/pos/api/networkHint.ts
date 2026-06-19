/** Mensajes de red/CORS — autónomos del host. */

export const CORS_USER_MESSAGE =
  "No se pudo conectar con el servidor. Verifica la red o la configuración del proxy.";

export function isLikelyCorsOrNetworkBlock(error: unknown): boolean {
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("load failed")
    );
  }
  return false;
}
