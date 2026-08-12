import { z } from "zod";

export const teamSchema = z.object({
  name: z.string().trim().min(2, "Team name must be at least 2 characters.").max(60),
  game: z.string().trim().min(2, "Game is required.").max(60),
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
