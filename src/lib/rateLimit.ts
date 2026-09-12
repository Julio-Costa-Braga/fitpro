const hits = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  max = 5,
  windowMs = 15 * 60 * 1000
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
  return { allowed: true, retryAfterSec: 0 };
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}