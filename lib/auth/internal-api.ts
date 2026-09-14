import "server-only";
import { hashSecret, hashesMatch } from "@/lib/oauth/crypto";

/**
 * Guards the server-to-server-only /api/internal/* routes (see that folder) — called by the hub
 * to check a user's Formation credentials without the browser ever visiting Formation's own
 * pages. These routes are reachable at the same public hostname as everything else (Caddy proxies
 * every path, see Caddyfile), so this bearer check is the only thing standing between them and the
 * open internet — fail closed on any missing piece before ever touching the hash comparison.
 */
export function verifyInternalApiSecret(request: Request): boolean {
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected) return false;

  const header = request.headers.get("authorization");
  const provided = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : null;
  if (!provided) return false;

  return hashesMatch(hashSecret(provided), hashSecret(expected));
}
