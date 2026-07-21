import "server-only";
import { redirect } from "next/navigation";
import type { Permission } from "@/lib/generated/prisma/enums";
import type { SessionMembership } from "@/lib/auth/types";

/** For page-level (not action-level) gating: redirects rather than throwing. */
export function requirePagePermission(orgSlug: string, membership: SessionMembership, permission: Permission) {
  if (!membership.permissions.includes(permission)) {
    redirect(`/${orgSlug}/dashboard`);
  }
}
