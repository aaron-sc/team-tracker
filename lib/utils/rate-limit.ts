import "server-only";
import { headers } from "next/headers";

/**
 * In-memory, per-process sliding-window rate limiter. Deliberately simple — this app runs as a
 * single container on one VM (see docker-compose.yml), so there's no multi-instance state to
 * share and no Redis/external store to justify. Resets on deploy/restart, which is an acceptable
 * tradeoff for what this guards (login/signup/password-reset abuse), not a correctness-critical
 * limit.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

// Sweep expired entries occasionally so this doesn't grow unbounded under sustained traffic.
let lastSweep = Date.now();
function sweep() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** Best-effort real client IP — deliberately does NOT trust X-Forwarded-For: Caddy (the only
 *  reverse proxy in front of this app, see Caddyfile) appends to whatever XFF value a caller
 *  already sent rather than overwriting it, so a request straight to the origin (bypassing
 *  Cloudflare) can forge the first hop and get a fresh rate-limit bucket on every attempt.
 *  CF-Connecting-IP is set by Cloudflare itself from the real TCP peer and can't be forwarded by
 *  a client. Real browser traffic goes through Cloudflare and gets this header; genuine
 *  server-to-server calls (e.g. the hub's internal credential checks) never transit Cloudflare at
 *  all, so they fall through to "unknown" — a single shared bucket across all such calls, which
 *  is intentional (see the internal API routes' rate-limit comments for why). */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const cfConnectingIp = h.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();
  return "unknown";
}

/**
 * Returns true if the action identified by `action` is currently allowed for this client,
 * incrementing its counter as a side effect. `max` attempts per `windowMs` per IP.
 */
export async function checkRateLimit(action: string, max: number, windowMs: number): Promise<boolean> {
  sweep();
  const ip = await getClientIp();
  const key = `${action}:${ip}`;
  const now = Date.now();

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}
