const hits = new Map<string, number[]>();
const MAX_KEYS = 5000;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
let sweepCounter = 0;

function sweep(now: number) {
  const ttl = DEFAULT_WINDOW_MS;
  for (const [key, timestamps] of hits) {
    const fresh = timestamps.filter((t) => t > now - ttl);
    if (fresh.length === 0) hits.delete(key);
    else hits.set(key, fresh);
  }
}

export function checkRateLimit(
  key: string,
  max = 5,
  windowMs = DEFAULT_WINDOW_MS
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (recent.length >= max) {
    const retryAfterSec = Math.ceil((recent[0] + windowMs - now) / 1000);
    return { allowed: false, retryAfterSec };
  }

  recent.push(now);
  hits.set(key, recent);

  sweepCounter++;
  if (sweepCounter % 100 === 0 || hits.size > MAX_KEYS) {
    sweep(now);
  }

  return { allowed: true, retryAfterSec: 0 };
}

export function clientIp(request: Request): string {
  // Em proxies que APPENDAM o IP real (Vercel, nginx), a entrada mais a direita
  // e a mais confiavel. O atacante controla apenas as entradas a esquerda.
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const entries = fwd
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (entries.length > 0) return entries[entries.length - 1];
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}