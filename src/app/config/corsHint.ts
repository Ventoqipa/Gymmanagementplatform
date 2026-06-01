export function isLikelyCorsOrNetworkBlock(error: unknown): boolean {
  if (!(error instanceof TypeError)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("load failed")
  );
}

export const CORS_USER_MESSAGE =
  "El navegador bloqueó la conexión con el API (CORS/SSL). Desarrollo: npm run dev sin URLs absolutas en .env. Producción: haz npm run build y despliega dist/ con web.config (proxy /security-api en el mismo dominio).";
