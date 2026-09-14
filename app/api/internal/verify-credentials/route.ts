import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { verifyInternalApiSecret } from "@/lib/auth/internal-api";
import { createPending2faToken } from "@/lib/auth/pending-2fa";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { recordLoginEvent } from "@/auth";

/**
 * Server-to-server only — lets the hub check a Formation email+password without the browser ever
 * loading a Formation page (see esports-hub's lib/auth/formation-credentials.ts). Mirrors
 * loginAction's exact logic (lib/actions/auth.ts) since this genuinely IS that same login, just
 * fronted by a different app.
 *
 * Rate limiting is two-layered because every legitimate call here shares one caller identity (the
 * hub's own server), not one browser — see lib/utils/rate-limit.ts's getClientIp for why that
 * bucket is "unknown" for real internal traffic. The aggregate cap is just a circuit breaker; the
 * per-email cap below is the actual brute-force defense.
 */
export async function POST(request: NextRequest) {
  if (!verifyInternalApiSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const aggregateAllowed = await checkRateLimit("internal_verify_credentials", 120, 60 * 1000);
  if (!aggregateAllowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const perTargetAllowed = await checkRateLimit(`internal_verify:${email}`, 10, 5 * 60 * 1000);
  if (!perTargetAllowed) {
    return NextResponse.json({ ok: false, reason: "rate_limited" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordValid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !passwordValid) {
    return NextResponse.json({ ok: false, reason: "invalid_credentials" });
  }

  if (user.totpEnabledAt) {
    return NextResponse.json({ ok: false, reason: "totp_required", pendingToken: createPending2faToken(user.id) });
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
