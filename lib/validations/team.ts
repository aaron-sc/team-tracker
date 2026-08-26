import { z } from "zod";
import { REMINDER_MINUTES_VALUES } from "@/lib/utils/reminder-options";

export const teamSchema = z.object({
  name: z.string().trim().min(2, "Team name must be at least 2 characters.").max(60),
  game: z.string().trim().min(2, "Game is required.").max(60),
});

export const teamDiscordSettingsSchema = z.object({
  webhookUrl: z.string().trim().max(500).optional().or(z.literal("")),
  mentionRoleId: z.string().trim().max(30).optional().or(z.literal("")),
  matchReminderMinutes: z.enum(REMINDER_MINUTES_VALUES),
  practiceReminderMinutes: z.enum(REMINDER_MINUTES_VALUES),
  scrimReminderMinutes: z.enum(REMINDER_MINUTES_VALUES),
});

export const rosterEntrySchema = z.object({
  membershipId: z.string().min(1),
  jerseyNumber: z.string().trim().max(10).optional().or(z.literal("")),
  position: z.string().trim().max(40).optional().or(z.literal("")),
  inGameName: z.string().trim().max(40).optional().or(z.literal("")),
  trackerLink: z.string().trim().url("Enter a valid URL.").max(300).optional().or(z.literal("")),
  isStarter: z.boolean().default(false),
});

export const updateRosterEntrySchema = z.object({
  jerseyNumber: z.string().trim().max(10).optional().or(z.literal("")),
  position: z.string().trim().max(40).optional().or(z.literal("")),
  inGameName: z.string().trim().max(40).optional().or(z.literal("")),
  trackerLink: z.string().trim().url("Enter a valid URL.").max(300).optional().or(z.literal("")),
  isStarter: z.boolean().default(false),
});
