import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  orgName: z.string().trim().min(2, "Organization name must be at least 2 characters.").max(80),
});

export const acceptInviteNewUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  password: z.string().min(8, "Password must be at least 8 characters."),
  token: z.string().min(1),
});

export const joinTeamNewUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  token: z.string().min(1),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const updateNameSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
});

export const updateTimezoneSchema = z.object({
  timezone: z.string().trim().min(1, "Choose a timezone."),
});

export const updateProfileDetailsSchema = z.object({
  discordHandle: z.string().trim().max(40).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(8, "New password must be at least 8 characters."),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from your current password.",
    path: ["newPassword"],
  });
