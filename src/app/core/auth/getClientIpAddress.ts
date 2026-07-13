const IP_CACHE_KEY = "elite_gym_client_ip";
const IP_CACHE_TTL_MS = 60 * 60 * 1000;

type IpCache = { ip: string; at: number };

const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;

function isValidIpv4(ip: string): boolean {
  const trimmed = ip.trim();
  return trimmed.length > 0 && trimmed !== "0.0.0.0" && IPV4_RE.test(trimmed);
}

function readCachedIp(): string | null {
  try {
    const raw = sessionStorage.getItem(IP_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as IpCache;
    if (Date.now() - cached.at < IP_CACHE_TTL_MS && isValidIpv4(cached.ip)) {
      return cached.ip.trim();
    }
  } catch {
    /* ignore */
  }
  return null;
}

function cacheIp(ip: string): void {
  sessionStorage.setItem(
    IP_CACHE_KEY,
    JSON.stringify({ ip, at: Date.now() } satisfies IpCache),
  );
}

async function fetchWithTimeout(
  url: string,
  timeoutMs = 5000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

async function ipFromIpify(): Promise<string | null> {
  const res = await fetchWithTimeout("https://api.ipify.org?format=json");
  if (!res.ok) return null;
  const data = (await res.json()) as { ip?: string };
  const ip = data.ip?.trim();
  return ip && isValidIpv4(ip) ? ip : null;
}

async function ipFromCloudflareTrace(): Promise<string | null> {
  const res = await fetchWithTimeout("https://www.cloudflare.com/cdn-cgi/trace");
  if (!res.ok) return null;
  const text = await res.text();
  const line = text.split("\n").find((row) => row.startsWith("ip="));
  const ip = line?.slice(3).trim();
  return ip && isValidIpv4(ip) ? ip : null;
}

/** Intenta obtener la IP pública del cliente; usa caché en sessionStorage. */
export async function getClientIpAddress(): Promise<string> {
  const cached = readCachedIp();
  if (cached) return cached;

  const providers = [ipFromIpify, ipFromCloudflareTrace];

  for (const provider of providers) {
    try {
      const ip = await provider();
      if (ip) {
        cacheIp(ip);
        return ip;
      }
    } catch {
      /* siguiente proveedor */
    }
  }

  return "";
}

export { isValidIpv4 };
