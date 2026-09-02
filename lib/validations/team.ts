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

const trackerUrl = z.string().trim().url("Enter a valid URL.").max(300).optional().or(z.literal(""));

const rosterProfileFields = {
  jerseyNumber: z.string().trim().max(10).optional().or(z.literal("")),
  position: z.string().trim().max(40).optional().or(z.literal("")),
  inGameName: z.string().trim().max(40).optional().or(z.literal("")),
  bio: z.string().trim().max(1000).optional().or(z.literal("")),
  trackerLink: trackerUrl,
  trackerValorant: trackerUrl,
  trackerRocketLeague: trackerUrl,
  trackerSmash: trackerUrl,
  trackerLeagueOfLegends: trackerUrl,
  isStarter: z.boolean().default(false),
};

export const rosterEntrySchema = z.object({
  membershipId: z.string().min(1),
  ...rosterProfileFields,
});

export const updateRosterEntrySchema = z.object(rosterProfileFields);
