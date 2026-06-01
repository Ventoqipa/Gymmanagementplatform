const IP_CACHE_KEY = "elite_gym_client_ip";
const IP_CACHE_TTL_MS = 60 * 60 * 1000;

type IpCache = { ip: string; at: number };

/** Intenta obtener la IP pública del cliente; usa caché en sessionStorage. */
export async function getClientIpAddress(): Promise<string> {
  try {
    const raw = sessionStorage.getItem(IP_CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw) as IpCache;
      if (Date.now() - cached.at < IP_CACHE_TTL_MS && cached.ip) {
        return cached.ip;
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const res = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = (await res.json()) as { ip?: string };
      if (data.ip?.trim()) {
        const ip = data.ip.trim();
        sessionStorage.setItem(
          IP_CACHE_KEY,
          JSON.stringify({ ip, at: Date.now() } satisfies IpCache),
        );
        return ip;
      }
    }
  } catch {
    /* fallback */
  }

  return "0.0.0.0";
}
