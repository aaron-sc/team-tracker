import { z } from "zod";
import { Permission } from "@/lib/generated/prisma/enums";

export const orgProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  timezone: z.string().trim().min(1),
});

export const roleSchema = z.object({
  name: z.string().trim().min(2, "Role name must be at least 2 characters.").max(40),
  description: z.string().trim().max(200).optional().or(z.literal("")),
  color: z.string().trim().max(20).optional().or(z.literal("")),
  permissions: z.array(z.enum(Permission)).default([]),
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  roleId: z.string().min(1, "Choose a role."),
});
