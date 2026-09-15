import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/lib/auth/auth.config";
import { prisma } from "@/lib/db/prisma";
import { loadMemberships } from "@/lib/auth/load-memberships";
import { verifySecondFactor } from "@/lib/auth/totp";
import { verifyPending2faToken } from "@/lib/auth/pending-2fa";

/** Best-effort client IP for the "recent sign-ins" list — same X-Forwarded-For trust as
 *  lib/utils/rate-limit.ts (Caddy is the only reverse proxy in front of this app). */
function clientInfo(request?: Request) {
  const h = request?.headers;
  const forwardedFor = h?.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : null;
  const userAgent = h?.get("user-agent") ?? null;
  return { ip, userAgent };
}

export async function recordLoginEvent(userId: string, request?: Request) {
  const { ip, userAgent } = clientInfo(request);
  await prisma.loginEvent.create({ data: { userId, ip, userAgent } });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, account }) {
      if (user?.id) {
        // This fork's OAuth/OIDC callback handler (getUserAndAccount in @auth/core's oauth/
        // callback.ts) intentionally discards whatever `id` a provider's profile() callback
        // returns and replaces it with a fresh crypto.randomUUID() — it expects a database
        // Adapter to resolve the real user via account.providerAccountId (which DOES preserve
        // the real id: for "esports-tools" that's Formation's own real User.id, since profile()
        // returns it as `id`). This app has no Adapter, so `user.id` alone would be a random,
        // unbacked UUID for every esports-tools sign-in. account.providerAccountId is the real
        // id in all three providers here — for "credentials"/"totp" Auth.js sets it to the exact
        // same value authorize() returned as `user.id` (see @auth/core's credentials callback),
        // so preferring it is a no-op for those and the actual fix for "esports-tools".
        const realUserId = account?.providerAccountId ?? user.id;
        token.userId = realUserId;
        // Baked in once, right here, at sign-in — not derived from `iat` (see next-auth.d.ts for
        // why that doesn't work in this fork). Everything after this block only ever compares
        // against this stored value, never re-stamps it.
        const dbUser = await prisma.user.findUnique({ where: { id: realUserId }, select: { sessionsValidFrom: true } });
        token.sessionEpoch = dbUser?.sessionsValidFrom?.getTime() ?? 0;
        return token;
      }
      // "Sign out everywhere" (Settings -> account security) bumps sessionsValidFrom to now — any
      // token whose baked-in sessionEpoch predates that instant stops working here, forcing a
      // fresh login. Checked on every request since the whole point is revoking tokens that
      // already exist, not just refusing to issue new ones.
      if (token.userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId as string },
          select: { sessionsValidFrom: true },
        });
        const currentEpoch = dbUser?.sessionsValidFrom?.getTime() ?? 0;
        const tokenEpoch = (token.sessionEpoch as number | undefined) ?? 0;
        if (currentEpoch > tokenEpoch) {
          return null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId && session.user) {
        session.user.id = token.userId as string;
        const [memberships, user] = await Promise.all([
          loadMemberships(token.userId as string),
          prisma.user.findUnique({
            where: { id: token.userId as string },
            select: { name: true, avatarUrl: true, emailVerifiedAt: true, timezone: true, timeFormat: true },
          }),
        ]);
        session.memberships = memberships;
        session.user.hasVerifiedEmail = !!user?.emailVerifiedAt;
        session.user.timezone = user?.timezone ?? null;
        session.user.timeFormat = user?.timeFormat === "24h" ? "24h" : "12h";
        if (user?.name) session.user.name = user.name;
        if (user?.avatarUrl) session.user.image = user.avatarUrl;
      } else {
        session.memberships = [];
      }
      return session;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // 2FA accounts can't complete sign-in through this provider at all — loginAction checks
        // totpEnabledAt itself and routes to /login/2fa before ever calling signIn("credentials"),
        // but this rejects it too as defense in depth against anything calling it directly.
        if (user.totpEnabledAt) return null;

        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        await recordLoginEvent(user.id, request);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
        };
      },
    }),
    // The second step of 2FA sign-in — see lib/auth/pending-2fa.ts and lib/actions/auth.ts's
    // loginAction/verifyTwoFactorAction. Never re-touches the password: authorizes off of the
    // short-lived signed token proving the password already checked out, plus a TOTP or recovery
    // code, so the plaintext password never needs to exist past the first step.
    Credentials({
      id: "totp",
      name: "Two-factor code",
      credentials: {
        pendingToken: { label: "Pending token", type: "text" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials, request) {
        const pendingToken = credentials?.pendingToken;
        const code = credentials?.code;
        if (typeof pendingToken !== "string" || typeof code !== "string") return null;

        const pending = verifyPending2faToken(pendingToken);
        if (!pending) return null;

        const user = await prisma.user.findUnique({ where: { id: pending.userId } });
        if (!user || !user.totpEnabledAt || !user.totpSecret) return null;

        const ok = await verifySecondFactor(user.id, code);
        if (!ok) return null;

        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        await recordLoginEvent(user.id, request);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
        };
      },
    }),
    {
      // Trusts an existing esports-tools.com (the hub) session — see app/sso/route.ts, which is
      // what actually triggers this (never linked to directly from a bare hostname). The hub's
      // `sub` claim IS this app's own real User.id (identity originates here — see that repo's
      // lib/auth/formation-credentials.ts), so this just re-fetches the existing user rather than
      // finding-or-creating one the way Vault's findOrCreateSsoUser does.
      //
      // Known, accepted trade-off: unlike the "credentials"/"totp" providers above, this one has
      // no 2FA gate of its own — a live hub session (up to its own 2h maxAge) is enough to mint a
      // fresh Formation session with no password/TOTP prompt. Not a new hole: the identity was
      // already proven via password+2FA at the hub's own native-login time. Formation's
      // sessionEpoch revocation ("sign out everywhere") still applies to sessions minted this way
      // exactly as it does to any other, since the jwt callback above checks it unconditionally.
      id: "esports-tools",
      name: "esports-tools.com",
      type: "oidc",
      issuer: process.env.AUTH_ISSUER,
      clientId: process.env.OIDC_CLIENT_ID,
      clientSecret: process.env.OIDC_CLIENT_SECRET,
      // The hub's /oauth/token only implements client_secret_post (see that repo's app/oauth/
      // token/route.ts) — Auth.js defaults new OIDC providers to client_secret_basic.
      client: { token_endpoint_auth_method: "client_secret_post" },
      checks: ["pkce", "state", "nonce"],
      authorization: { params: { scope: "openid profile email" } },
      async profile(profile) {
        const user = await prisma.user.findUnique({ where: { id: profile.sub as string } });
        // Should never happen — the hub only ever issues a `sub` that originated from this app's
        // own User.id in the first place. Throwing (not returning null, which this callback's
        // type doesn't accept) fails the sign-in cleanly if it somehow does.
        if (!user) throw new Error("No Formation account found for this esports-tools.com session.");

        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        // No real Request object is available in an OIDC provider's profile() callback (unlike
        // authorize() above) — recordLoginEvent handles a missing request fine, just logging a
        // null ip/userAgent for this sign-in method.
        await recordLoginEvent(user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
        };
      },
    },
  ],
});
