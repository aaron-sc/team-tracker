import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe base config (no providers, no Prisma/bcrypt) so it can run
 * directly in middleware. Membership/permission loading happens only in the
 * full config (auth.ts), which runs in the Node runtime — this keeps
 * middleware a cheap "is there a valid session" check with zero DB access.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isPublic =
        pathname === "/" ||
        pathname.startsWith("/login") ||
        pathname.startsWith("/signup") ||
        pathname.startsWith("/invite") ||
        pathname.startsWith("/join") ||
        pathname.startsWith("/forgot-password") ||
        pathname.startsWith("/reset-password") ||
        pathname.startsWith("/verify-email") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/v1");
      return isPublic || isLoggedIn;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
