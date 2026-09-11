"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth, signIn, signOut } from "@/auth";
import { createPending2faToken } from "@/lib/auth/pending-2fa";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { ROLE_PRESETS } from "@/lib/permissions";
import { isReservedSlug, slugify } from "@/lib/utils/slug";
import {
  loginSchema,
  signupSchema,
  createOrgSchema,
  acceptInviteNewUserSchema,
  joinTeamNewUserSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateNameSchema,
  updateTimezoneSchema,
  updateTimeFormatSchema,
  updateProfileDetailsSchema,
} from "@/lib/validations/auth";
import { createNotification } from "@/lib/notifications/create";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/constants/notification-types";
import { sendVerificationEmail } from "@/lib/actions/email-verification";
import { saveUploadedImage, deleteUploadedFile, UploadError } from "@/lib/storage/local";
import { sendEmail } from "@/lib/email/resend";
import { resetPasswordEmailHtml } from "@/lib/email/templates";
import { getBaseUrl } from "@/lib/utils/base-url";
import { checkRateLimit } from "@/lib/utils/rate-limit";

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
const PENDING_2FA_COOKIE = "formation_pending_2fa";

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const allowed = await checkRateLimit("login", 10, 5 * 60 * 1000);
  if (!allowed) return { error: "Too many attempts. Try again in a few minutes." };

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

  // Checked here rather than solely inside the "credentials" provider's authorize() (which also
  // rejects a 2FA account, as defense in depth) because we need to know *before* calling signIn()
  // whether to route to the /login/2fa interstitial instead of completing sign-in outright.
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  const passwordValid = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
  if (!user || !passwordValid) {
    return { error: "Invalid email or password." };
  }

  if (user.totpEnabledAt) {
    const cookieStore = await cookies();
    cookieStore.set(PENDING_2FA_COOKIE, createPending2faToken(user.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 5 * 60,
      path: "/",
    });
    redirect(`/login/2fa?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

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

/** The second step for a 2FA account — see loginAction above and lib/auth/pending-2fa.ts. Reads
 *  the short-lived cookie loginAction set (proof the password already checked out) rather than
 *  ever asking for the password again here. */
export async function verifyTwoFactorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const allowed = await checkRateLimit("2fa_verify", 10, 5 * 60 * 1000);
  if (!allowed) return { error: "Too many attempts. Try again in a few minutes." };

  const cookieStore = await cookies();
  const pendingToken = cookieStore.get(PENDING_2FA_COOKIE)?.value;
  if (!pendingToken) return { error: "That took too long — log in again." };

  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Enter a code." };

  const redirectTo = typeof formData.get("redirectTo") === "string" && formData.get("redirectTo")
    ? (formData.get("redirectTo") as string)
    : "/orgs";

  try {
    await signIn("totp", { pendingToken, code, redirectTo });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Incorrect code." };
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

/** How many organizations one person is allowed to own (be the system "Owner" of). Memberships
 *  in orgs someone else owns don't count. */
const MAX_ORGS_PER_USER = 5;

function countOwnedOrgs(userId: string): Promise<number> {
  return prisma.membership.count({
    where: { userId, role: { isSystem: true, name: "Owner" } },
  });
}

/**
 * Creates the first account + org for someone who was approved through the access-request gate.
 * Only reachable with a valid, approved, unconsumed AccessRequest token (see /signup?token=… and
 * lib/actions/access-request.ts) — the email is taken from that request, never from form input,
 * so an approval can't be redirected to a different address.
 */
export async function signupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const allowed = await checkRateLimit("signup", 5, 60 * 60 * 1000);
  if (!allowed) return { error: "Too many attempts. Try again later." };

  const token = String(formData.get("token") ?? "");
  const accessRequest = token
    ? await prisma.accessRequest.findUnique({ where: { token } })
    : null;
  if (!accessRequest || accessRequest.status !== "APPROVED" || accessRequest.consumedAt) {
    return { error: "This signup link isn't valid anymore. Request access again to get a new one." };
  }

  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: accessRequest.email,
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

    await tx.accessRequest.update({
      where: { id: accessRequest.id },
      data: { consumedAt: new Date() },
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

/** Lets an already-logged-in user create and own a second (or third, ...) organization. */
export async function createAdditionalOrgAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be logged in." };
  }

  const parsed = createOrgSchema.safeParse({ orgName: formData.get("orgName") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  if ((await countOwnedOrgs(session.user.id)) >= MAX_ORGS_PER_USER) {
    return { error: `You can own at most ${MAX_ORGS_PER_USER} organizations.` };
  }

  const slug = await generateUniqueOrgSlug(parsed.data.orgName);

  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name: parsed.data.orgName, slug } });

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
      data: { userId: session.user.id, orgId: org.id, roleId: ownerRoleId! },
    });
  });

  redirect(`/${slug}/dashboard`);
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

export type RequestResetState = { error?: string; message?: string; devResetUrl?: string } | undefined;

const RESET_REQUEST_GENERIC_MESSAGE = "If an account exists for that email, we've sent a password reset link.";

/**
 * Always returns the same generic message regardless of whether the account exists — revealing
 * that distinction (user enumeration) is a real, common attack primitive, not a cosmetic detail.
 * Likewise, the reset link is only ever emailed to the account's own address, never returned in
 * the response — the one exception is a dev-only fallback (see below) for when no email provider
 * is configured locally.
 */
export async function requestPasswordResetAction(
  _prev: RequestResetState,
  formData: FormData,
): Promise<RequestResetState> {
  const allowed = await checkRateLimit("password-reset-request", 5, 15 * 60 * 1000);
  if (!allowed) return { error: "Too many attempts. Try again in a few minutes." };

  const parsed = requestPasswordResetSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return { message: RESET_REQUEST_GENERIC_MESSAGE };
  }

  const token = crypto.randomBytes(32).toString("base64url");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000),
    },
  });

  const resetUrl = `${await getBaseUrl()}/reset-password/${token}`;
  const result = await sendEmail({
    to: user.email,
    subject: "Reset your Formation password",
    html: resetPasswordEmailHtml({ name: user.name, resetUrl }),
  });

  // Dev-only convenience for when no email provider is configured — never surfaced once deployed
  // for real (NODE_ENV=production), and still wrapped in the same generic message either way, so
  // this can't be used to distinguish a real account from a made-up one.
  if (!result.ok && process.env.NODE_ENV !== "production") {
    return { message: RESET_REQUEST_GENERIC_MESSAGE, devResetUrl: `/reset-password/${token}` };
  }

  return { message: RESET_REQUEST_GENERIC_MESSAGE };
}

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const allowed = await checkRateLimit("password-reset-submit", 10, 15 * 60 * 1000);
  if (!allowed) return { error: "Too many attempts. Try again in a few minutes." };

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

export type UpdateTimezoneState = { error?: string; success?: string } | undefined;

export async function updateTimezoneAction(_prev: UpdateTimezoneState, formData: FormData): Promise<UpdateTimezoneState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be logged in." };
  }

  const parsed = updateTimezoneSchema.safeParse({ timezone: formData.get("timezone") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await prisma.user.update({ where: { id: session.user.id }, data: { timezone: parsed.data.timezone } });

  return { success: "Timezone updated. Match and practice times will now show in your local time." };
}

export type UpdateTimeFormatState = { error?: string; success?: string } | undefined;

export async function updateTimeFormatAction(_prev: UpdateTimeFormatState, formData: FormData): Promise<UpdateTimeFormatState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be logged in." };
  }

  const parsed = updateTimeFormatSchema.safeParse({ timeFormat: formData.get("timeFormat") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await prisma.user.update({ where: { id: session.user.id }, data: { timeFormat: parsed.data.timeFormat } });

  return { success: "Time format updated." };
}

export type UpdateNotificationPreferencesState = { error?: string; success?: string } | undefined;

export async function updateNotificationPreferencesAction(
  _prev: UpdateNotificationPreferencesState,
  formData: FormData,
): Promise<UpdateNotificationPreferencesState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be logged in." };
  }

  // Checkboxes submit which types are still subscribed (checked = on) — muted is the complement,
  // so a type introduced after a user last saved defaults to subscribed rather than silently muted.
  const subscribed = new Set(formData.getAll("subscribed").filter((v): v is string => typeof v === "string"));
  const muted = Object.keys(NOTIFICATION_TYPE_LABELS).filter((type) => !subscribed.has(type));

  await prisma.user.update({
    where: { id: session.user.id },
    data: { mutedNotificationTypes: muted.length > 0 ? muted : Prisma.JsonNull },
  });

  return { success: "Notification preferences saved." };
}

export type UpdateProfileDetailsState = { error?: string; success?: string } | undefined;

export async function updateProfileDetailsAction(
  _prev: UpdateProfileDetailsState,
  formData: FormData,
): Promise<UpdateProfileDetailsState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be logged in." };
  }

  const parsed = updateProfileDetailsSchema.safeParse({
    discordHandle: formData.get("discordHandle") ?? "",
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { discordHandle: parsed.data.discordHandle || null, phone: parsed.data.phone || null },
  });

  return { success: "Profile updated." };
}

export type UpdateAvatarState = { error?: string; success?: string } | undefined;

export async function updateAvatarAction(_prev: UpdateAvatarState, formData: FormData): Promise<UpdateAvatarState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be logged in." };
  }

  const file = formData.get("avatar");
  let avatarUrl: string;
  try {
    avatarUrl = await saveUploadedImage(file as File, "avatars");
  } catch (err) {
    return { error: err instanceof UploadError ? err.message : "Could not upload image." };
  }

  const previousUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { avatarUrl: true } });
  await prisma.user.update({ where: { id: session.user.id }, data: { avatarUrl } });
  await deleteUploadedFile(previousUser?.avatarUrl);

  return { success: "Profile picture updated." };
}

export async function removeAvatarAction(): Promise<UpdateAvatarState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be logged in." };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { error: "User not found." };

  await prisma.user.update({ where: { id: session.user.id }, data: { avatarUrl: null } });
  await deleteUploadedFile(user.avatarUrl);

  return { success: "Profile picture removed." };
}
