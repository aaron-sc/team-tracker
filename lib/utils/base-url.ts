import "server-only";
import { headers } from "next/headers";

/**
 * Absolute origin for building links inside emails (which can't use relative
 * URLs). Prefers APP_URL when set — useful behind a proxy where the `host`
 * header doesn't match the public domain — and otherwise derives it from the
 * incoming request, so it works with zero config in local dev.
 */
export async function getBaseUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");

  const h = await headers();
  const host = h.get("host") ?? "localhost:3300";
  const proto = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${proto}://${host}`;
}

/**
 * Same idea as getBaseUrl(), but for code with no incoming request to read headers from (e.g.
 * the Discord reminder sweep, which runs off a setInterval — not a request). Falls back to the
 * DOMAIN env var Caddy already requires for self-hosted deploys (see docker-compose.yml), so it
 * works out of the box in production without extra config. Returns null if neither is set (e.g.
 * local dev), letting the caller omit the link rather than build a broken one.
 */
export function getBackgroundBaseUrl(): string | null {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.DOMAIN) return `https://${process.env.DOMAIN}`;
  return null;
}
