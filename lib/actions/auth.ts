"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { ROLE_PRESETS } from "@/lib/permissions";
import { isReservedSlug, slugify } from "@/lib/utils/slug";
import {
  loginSchema,
  signupSchema,
  acceptInviteNewUserSchema,
  joinTeamNewUserSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateNameSchema,
} from "@/lib/validations/auth";
import { createNotification } from "@/lib/notifications/create";
import { sendVerificationEmail } from "@/lib/actions/email-verification";

async function notifyInviterOfAcceptance(invite: { orgId: string; invitedById: string | null }, newMemberName: string) {
  if (!invite.invitedById) return;
  const inviterMembership = await prisma.membership.findUnique({
    where: { userId_orgId: { userId: invite.invitedById, orgId: invite.orgId } },
  });
  if (!inviterMembership) return;
  await createNotification({
    membershipId: inviterMembership.id,
    type: "invite_accepted",
    title: `${newMemberName} accepted your invite`,
  });
}

export type ActionState = { error?: string } | undefined;

const RESET_TOKEN_EXPIRY_HOURS = 1;

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const redirectTo = typeof formData.get("redirectTo") === "string" && formData.get("redirectTo")
    ? (formData.get("redirectTo") as string)
    : "/orgs";

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }
}

async function generateUniqueOrgSlug(name: string): Promise<string> {
  const base = slugify(name) || "org";
  let slug = base;
  let n = 1;
  while (isReservedSlug(slug) || (await prisma.organization.findUnique({ where: { slug } }))) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

export async function signupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    orgName: formData.get("orgName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { name, email, password, orgName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists. Try logging in instead." };
  }

  const slug = await generateUniqueOrgSlug(orgName);
  const passwordHash = await bcrypt.hash(password, 12);

  const newUserId = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name: orgName, slug } });
    const user = await tx.user.create({ data: { name, email, passwordHash } });

    let ownerRoleId: string | null = null;
    for (const [roleName, preset] of Object.entries(ROLE_PRESETS)) {
      const role = await tx.role.create({
        data: {
          orgId: org.id,
          name: roleName,
          description: preset.description,
          color: preset.color,
          isSystem: true,
          permissions: { create: preset.permissions.map((permission) => ({ permission })) },
        },
      });
      if (roleName === "Owner") ownerRoleId = role.id;
    }

    await tx.membership.create({
      data: { userId: user.id, orgId: org.id, roleId: ownerRoleId! },
    });

    return user.id;
  });

  await sendVerificationEmail(newUserId, email, name);

  try {
    await signIn("credentials", { email, password, redirectTo: "/orgs" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created — but automatic sign-in failed. Please log in." };
    }
    throw error;
  }
}

export async function acceptInviteAsNewUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = acceptInviteNewUserSchema.safeParse({
    name: formData.get("name"),
    password: formData.get("password"),
    token: formData.get("token"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { name, password, token } = parsed.data;

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    return { error: "This invite link is no longer valid." };
  }

  const existing = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existing) {
    return { error: "An account already exists for this email. Please log in instead." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email: invite.email, passwordHash, emailVerifiedAt: new Date() },
    });
    await tx.membership.create({
      data: { userId: user.id, orgId: invite.orgId, roleId: invite.roleId, invitedById: invite.invitedById },
    });
    await tx.invite.update({ where: { id: invite.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
  });

  await notifyInviterOfAcceptance(invite, name);

  try {
    await signIn("credentials", { email: invite.email, password, redirectTo: "/orgs" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created — but automatic sign-in failed. Please log in." };
    }
    throw error;
  }
}

export async function acceptInviteAsExistingUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = formData.get("token");
  if (typeof token !== "string" || !token) {
    return { error: "Missing invite token." };
  }

  const session = await auth();
  if (!session?.user) {
    return { error: "You must be logged in to accept this invite." };
  }

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    return { error: "This invite link is no longer valid." };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.email !== invite.email) {
    return { error: "This invite was sent to a different email address than the account you're logged in with." };
  }

  const existingMembership = await prisma.membership.findUnique({
    where: { userId_orgId: { userId: user.id, orgId: invite.orgId } },
  });

  if (!existingMembership) {
    await prisma.$transaction(async (tx) => {
      await tx.membership.create({
        data: { userId: user.id, orgId: invite.orgId, roleId: invite.roleId, invitedById: invite.invitedById },
      });
      await tx.invite.update({ where: { id: invite.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
    });
    await notifyInviterOfAcceptance(invite, user.name);
  } else {
    await prisma.invite.update({ where: { id: invite.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
  }

  redirect("/orgs");
}

function isTeamInviteLinkValid(link: { revokedAt: Date | null; expiresAt: Date | null } | null): link is NonNullable<typeof link> {
  if (!link) return false;
  if (link.revokedAt) return false;
  if (link.expiresAt && link.expiresAt < new Date()) return false;
  return true;
}

/** Adds the team + (if new to the org) a Membership under the link's role. Reusable — not single-use. */
export async function acceptTeamInviteLinkAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = formData.get("token");
  if (typeof token !== "string" || !token) return { error: "Missing invite token." };

  const session = await auth();
  if (!session?.user) return { error: "You must be logged in to accept this invite." };

  const link = await prisma.teamInviteLink.findUnique({ where: { token } });
  if (!isTeamInviteLinkValid(link)) return { error: "This invite link is no longer valid." };

  await prisma.$transaction(async (tx) => {
    let membershipId: string;
    const existingMembership = await tx.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: link.orgId } },
    });
    if (existingMembership) {
      membershipId = existingMembership.id;
    } else {
      const created = await tx.membership.create({
        data: { userId: session.user.id, orgId: link.orgId, roleId: link.roleId },
      });
      membershipId = created.id;
    }

    const existingTeamMembership = await tx.teamMembership.findUnique({
      where: { membershipId_teamId: { membershipId, teamId: link.teamId } },
    });
    if (!existingTeamMembership) {
      await tx.teamMembership.create({ data: { membershipId, teamId: link.teamId } });
    }

    await tx.teamInviteLink.update({ where: { id: link.id }, data: { useCount: { increment: 1 } } });
  });

  redirect("/orgs");
}

/** Same as above, but for someone with no Formation account yet — creates the account first. */
export async function acceptTeamInviteLinkAsNewUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = joinTeamNewUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    token: formData.get("token"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { name, email, password, token } = parsed.data;

  const link = await prisma.teamInviteLink.findUnique({ where: { token } });
  if (!isTeamInviteLinkValid(link)) return { error: "This invite link is no longer valid." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists. Log in instead." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const newUserId = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name, email, passwordHash } });
    const membership = await tx.membership.create({
      data: { userId: user.id, orgId: link.orgId, roleId: link.roleId },
    });
    await tx.teamMembership.create({ data: { membershipId: membership.id, teamId: link.teamId } });
    await tx.teamInviteLink.update({ where: { id: link.id }, data: { useCount: { increment: 1 } } });
    return user.id;
  });

  // Unlike a targeted email Invite, a shareable link doesn't prove mailbox
  // ownership — treat this like signup: verification required before access.
  await sendVerificationEmail(newUserId, email, name);

  try {
    await signIn("credentials", { email, password, redirectTo: "/orgs" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created — but automatic sign-in failed. Please log in." };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export type RequestResetState = { error?: string; resetUrl?: string } | undefined;

/**
 * No email service is configured (see invite flow for the same pattern), so
 * instead of sending mail we hand back a copyable dev-mode link. This does
 * leak account existence to whoever submits the form — acceptable for local
 * dev, but flagged here as something a real deployment would need to fix by
 * wiring up actual email delivery and returning a generic message instead.
 */
export async function requestPasswordResetAction(
  _prev: RequestResetState,
  formData: FormData,
): Promise<RequestResetState> {
  const parsed = requestPasswordResetSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return { error: "No account found with that email." };
  }

  const token = crypto.randomBytes(32).toString("base64url");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000),
    },
  });

  return { resetUrl: `/reset-password/${token}` };
}

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token: parsed.data.token } });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return { error: "This reset link is no longer valid. Request a new one." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
  ]);

  redirect("/login");
}

export type ChangePasswordState = { error?: string; success?: string } | undefined;

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be logged in." };
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { error: "Account not found." };

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return { error: "Current password is incorrect." };

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return { success: "Password updated." };
}

export type UpdateNameState = { error?: string; success?: string } | undefined;

export async function updateNameAction(_prev: UpdateNameState, formData: FormData): Promise<UpdateNameState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be logged in." };
  }

  const parsed = updateNameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await prisma.user.update({ where: { id: session.user.id }, data: { name: parsed.data.name } });

  return { success: "Name updated." };
}
