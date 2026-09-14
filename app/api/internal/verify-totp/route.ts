import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyInternalApiSecret } from "@/lib/auth/internal-api";
import { verifyPending2faToken } from "@/lib/auth/pending-2fa";
import { verifySecondFactor } from "@/lib/auth/totp";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { recordLoginEvent } from "@/auth";

/**
 * The second step for a 2FA account, server-to-server — see verify-credentials/route.ts (which
 * hands back the pendingToken this expects) and esports-hub's lib/auth/formation-credentials.ts.
 * Same verifySecondFactor call as the native "totp" Auth.js provider (auth.ts) — never re-touches
 * the password, only the short-lived signed proof that it already checked out.
 */
export async function POST(request: NextRequest) {
  if (!verifyInternalApiSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const aggregateAllowed = await checkRateLimit("internal_verify_totp", 120, 60 * 1000);
  if (!aggregateAllowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { pendingToken, code } = (body ?? {}) as { pendingToken?: unknown; code?: unknown };
  if (typeof pendingToken !== "string" || typeof code !== "string") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const pending = verifyPending2faToken(pendingToken);
  if (!pending) {
    return NextResponse.json({ ok: false, reason: "invalid_token" });
  }

  const perTargetAllowed = await checkRateLimit(`internal_verify_totp:${pending.userId}`, 10, 5 * 60 * 1000);
  if (!perTargetAllowed) {
    return NextResponse.json({ ok: false, reason: "rate_limited" });
  }

  const user = await prisma.user.findUnique({ where: { id: pending.userId } });
  if (!user || !user.totpEnabledAt || !user.totpSecret) {
    return NextResponse.json({ ok: false, reason: "invalid_token" });
  }

  const ok = await verifySecondFactor(user.id, code);
  if (!ok) {
    return NextResponse.json({ ok: false, reason: "invalid_code" });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await recordLoginEvent(user.id, request);

  return NextResponse.json({
    ok: true,
    sub: user.id,
    email: user.email,
    name: user.name,
    picture: user.avatarUrl,
    emailVerified: !!user.emailVerifiedAt,
  });
}
