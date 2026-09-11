import type { DefaultSession } from "next-auth";
import type { SessionMembership } from "@/lib/auth/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      hasVerifiedEmail: boolean;
      timezone: string | null;
      timeFormat: "12h" | "24h";
    } & DefaultSession["user"];
    memberships: SessionMembership[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    // Baked in once, only when the user signs in (see auth.ts's jwt callback) — deliberately NOT
    // `iat`, which this fork re-stamps to "now" on every single request rather than preserving it
    // from the original sign-in, making it useless as a "when was this session issued" marker.
    // Epoch ms of User.sessionsValidFrom as of sign-in time (0 if never set); "sign out everywhere"
    // invalidates every token whose baked-in value predates the new sessionsValidFrom.
    sessionEpoch?: number;
  }
}
