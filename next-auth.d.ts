import type { DefaultSession } from "next-auth";
import type { SessionMembership } from "@/lib/auth/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      hasVerifiedEmail: boolean;
    } & DefaultSession["user"];
    memberships: SessionMembership[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
  }
}
