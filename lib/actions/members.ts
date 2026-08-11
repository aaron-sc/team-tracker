"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { inviteMemberSchema } from "@/lib/validations/org";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";
import { saveUploadedImage, deleteUploadedFile, UploadError } from "@/lib/storage/local";
import { sendEmail } from "@/lib/email/resend";
import { inviteEmailHtml } from "@/lib/email/templates";
import { getBaseUrl } from "@/lib/utils/base-url";

const INVITE_EXPIRY_DAYS = 7;

export async function createInviteAction(
  orgSlug: string,
  orgId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { session, membership } = await requirePermission(orgId, Permission.org_members_invite);

  const parsed = inviteMemberSchema.safeParse({
    email: formData.get("email"),
    roleId: formData.get("roleId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const role = await prisma.role.findUnique({ where: { id: parsed.data.roleId } });
  if (!role || role.orgId !== orgId) {
    return { error: "Invalid role selected." };
  }

  const existingMember = await prisma.membership.findFirst({
    where: { orgId, user: { email: parsed.data.email } },
  });
  if (existingMember) {
    return { error: "This person is already a member of the organization." };
  }

  const existingInvite = await prisma.invite.findFirst({
    where: { orgId, email: parsed.data.email, status: "PENDING" },
  });
  if (existingInvite) {
    return { error: "There's already a pending invite for this email." };
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.invite.create({
    data: {
      orgId,
      email: parsed.data.email,
      roleId: parsed.data.roleId,
      token,
      expiresAt,
      invitedById: session.user.id,
    },
  });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "invite.created",
    targetType: "Invite",
    targetId: token,
    metadata: { email: parsed.data.email, role: role.name },
  });

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true, themeColor: true } });
  const baseUrl = await getBaseUrl();
  const inviteUrl = `${baseUrl}/invite/${token}`;

  const emailResult = await sendEmail({
    to: parsed.data.email,
    subject: `You're invited to join ${org?.name ?? "an organization"} on Formation`,
    html: inviteEmailHtml({
      orgName: org?.name ?? "your organization",
      accentColor: org?.themeColor ?? "#6366f1",
      inviterName: session.user.name ?? session.user.email ?? "A teammate",
      roleName: role.name,
      inviteUrl,
    }),
  });

  revalidatePath(`/${orgSlug}/settings/members`);
  return {
    success: emailResult.ok
      ? `Invite email sent to ${parsed.data.email}.`
      : `Invite created for ${parsed.data.email} — email delivery isn't configured yet, so share the link below manually.`,
  };
}

export async function revokeInviteAction(orgSlug: string, orgId: string, inviteId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.org_members_invite);

  const invite = await prisma.invite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.orgId !== orgId) {
    return { error: "Invite not found." };
  }

  await prisma.invite.update({ where: { id: inviteId }, data: { status: "REVOKED" } });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "invite.revoked",
    targetType: "Invite",
    targetId: inviteId,
    metadata: { email: invite.email },
  });

  revalidatePath(`/${orgSlug}/settings/members`);
}

export async function changeMemberRoleAction(
  orgSlug: string,
  orgId: string,
  membershipId: string,
  roleId: string,
): Promise<ActionState> {
  const { membership: actor } = await requirePermission(orgId, Permission.org_members_manage);

  const target = await prisma.membership.findUnique({ where: { id: membershipId }, include: { role: true } });
  if (!target || target.orgId !== orgId) {
    return { error: "Member not found." };
  }

  const newRole = await prisma.role.findUnique({ where: { id: roleId } });
  if (!newRole || newRole.orgId !== orgId) {
    return { error: "Invalid role." };
  }

  if (target.role.name === "Owner" && newRole.name !== "Owner") {
    const ownerCount = await prisma.membership.count({ where: { orgId, role: { name: "Owner" } } });
    if (ownerCount <= 1) {
      return { error: "An organization must have at least one Owner." };
    }
  }

  await prisma.membership.update({ where: { id: membershipId }, data: { roleId } });

  await logAudit({
    orgId,
    actorMembershipId: actor.membershipId,
    action: "member.role_changed",
    targetType: "Membership",
    targetId: membershipId,
    metadata: { fromRole: target.role.name, toRole: newRole.name },
  });

  revalidatePath(`/${orgSlug}/settings/members`);
  revalidatePath(`/${orgSlug}/roster`);
}

export async function removeMemberAction(orgSlug: string, orgId: string, membershipId: string): Promise<ActionState> {
  const { membership: actor } = await requirePermission(orgId, Permission.org_members_remove);

  const target = await prisma.membership.findUnique({ where: { id: membershipId }, include: { role: true, user: true } });
  if (!target || target.orgId !== orgId) {
    return { error: "Member not found." };
  }
  if (target.role.name === "Owner") {
    const ownerCount = await prisma.membership.count({ where: { orgId, role: { name: "Owner" } } });
    if (ownerCount <= 1) {
      return { error: "An organization must have at least one Owner." };
    }
  }

  await prisma.membership.delete({ where: { id: membershipId } });

  await logAudit({
    orgId,
    actorMembershipId: actor.membershipId,
    action: "member.removed",
    targetType: "Membership",
    targetId: membershipId,
    metadata: { email: target.user.email },
  });

  revalidatePath(`/${orgSlug}/settings/members`);
  revalidatePath(`/${orgSlug}/roster`);
}

export async function updateOrgProfileAction(
  orgSlug: string,
  orgId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.org_settings_manage);

  const name = formData.get("name");
  const timezone = formData.get("timezone");
  const themeColor = formData.get("themeColor");
  if (typeof name !== "string" || name.trim().length < 2) {
    return { error: "Organization name must be at least 2 characters." };
  }
  if (typeof timezone !== "string" || !timezone) {
    return { error: "Timezone is required." };
  }
  if (typeof themeColor !== "string" || !/^#[0-9a-fA-F]{6}$/.test(themeColor)) {
    return { error: "Theme color must be a valid hex color." };
  }

  await prisma.organization.update({ where: { id: orgId }, data: { name: name.trim(), timezone, themeColor } });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "org.settings_updated",
    targetType: "Organization",
    targetId: orgId,
    metadata: { name, timezone, themeColor },
  });

  revalidatePath(`/${orgSlug}`, "layout");
  return { success: "Organization settings saved." };
}

export async function updateOrgLogoAction(
  orgSlug: string,
  orgId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.org_settings_manage);

  const file = formData.get("logo");
  let logoUrl: string;
  try {
    logoUrl = await saveUploadedImage(file as File, "org-logos");
  } catch (err) {
    return { error: err instanceof UploadError ? err.message : "Could not upload image." };
  }

  const previousOrg = await prisma.organization.findUnique({ where: { id: orgId }, select: { logoUrl: true } });
  await prisma.organization.update({ where: { id: orgId }, data: { logoUrl } });
  await deleteUploadedFile(previousOrg?.logoUrl);

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "org.logo_updated",
    targetType: "Organization",
    targetId: orgId,
    metadata: { logoUrl },
  });

  revalidatePath(`/${orgSlug}`, "layout");
  return { success: "Logo updated." };
}

export async function removeOrgLogoAction(orgSlug: string, orgId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.org_settings_manage);

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return { error: "Organization not found." };

  await prisma.organization.update({ where: { id: orgId }, data: { logoUrl: null } });
  await deleteUploadedFile(org.logoUrl);

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "org.logo_removed",
    targetType: "Organization",
    targetId: orgId,
  });

  revalidatePath(`/${orgSlug}`, "layout");
  return { success: "Logo removed." };
}
