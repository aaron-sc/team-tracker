import "server-only";
import { auth } from "@/auth";
import { Permission } from "@/lib/generated/prisma/client";
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

/** Whether the membership can see `teamId` at all — its own team, or (holding `teams_view_all`,
 *  see lib/permissions.ts) any team in the org. The one rule behind every "can this person see
 *  that team" check in the app — page gates use this to redirect/404, requireTeamScope below
 *  throws it for actions, and visibleTeamIds uses it to filter a list. */
export function canSeeTeam(membership: SessionMembership, teamId: string): boolean {
  return membership.teamIds.includes(teamId) || membership.permissions.includes(Permission.teams_view_all);
}

/** Throws unless canSeeTeam(membership, teamId) — the action-gating counterpart to canSeeTeam. */
export function requireTeamScope(membership: SessionMembership, teamId: string) {
  if (!canSeeTeam(membership, teamId)) {
    throw new ForbiddenError("You don't have access to this team.");
  }
}

/** Filters `allTeamIds` (every team id in the org) down to the ones this membership can see —
 *  for `WHERE teamId IN (...)`-style queries and list filtering. */
export function visibleTeamIds(membership: SessionMembership, allTeamIds: string[]): string[] {
  if (membership.permissions.includes(Permission.teams_view_all)) return allTeamIds;
  return allTeamIds.filter((id) => membership.teamIds.includes(id));
}

export function hasPermission(membership: SessionMembership, permission: Permission): boolean {
  return membership.permissions.includes(permission);
}
