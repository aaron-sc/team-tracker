import "server-only";
import { auth } from "@/auth";
import type { Permission } from "@/lib/generated/prisma/client";
import type { Session } from "next-auth";
import type { SessionMembership } from "@/lib/auth/types";

export class AuthError extends Error {}
export class ForbiddenError extends AuthError {
  constructor(message = "You don't have permission to do that.") {
    super(message);
  }
}
export class UnauthenticatedError extends AuthError {
  constructor(message = "You must be signed in.") {
    super(message);
  }
}

/** Throws if there is no signed-in user. Use at the top of any Server Action. */
export async function requireSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user) throw new UnauthenticatedError();
  return session;
}

/** Throws if the current user has no membership in the given org. */
export async function requireMembership(orgId: string): Promise<{ session: Session; membership: SessionMembership }> {
  const session = await requireSession();
  const membership = session.memberships.find((m) => m.orgId === orgId);
  if (!membership) throw new ForbiddenError("You are not a member of this organization.");
  return { session, membership };
}

/** Throws unless the current user's membership in orgId grants `permission`. */
export async function requirePermission(
  orgId: string,
  permission: Permission,
): Promise<{ session: Session; membership: SessionMembership }> {
  const { session, membership } = await requireMembership(orgId);
  if (!membership.permissions.includes(permission)) {
    throw new ForbiddenError();
  }
  return { session, membership };
}

/**
 * For roles below Coach/Owner, some actions should only apply to the actor's own team(s).
 * Throws unless the membership either holds `permission` org-wide via a role that also
 * has broader scope, or the target team is one of the membership's own teams.
 */
export function requireTeamScope(membership: SessionMembership, teamId: string) {
  if (!membership.teamIds.includes(teamId)) {
    throw new ForbiddenError("You don't have access to this team.");
  }
}

export function hasPermission(membership: SessionMembership, permission: Permission): boolean {
  return membership.permissions.includes(permission);
}
