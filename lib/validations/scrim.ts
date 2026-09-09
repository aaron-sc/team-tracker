import { z } from "zod";
import { MatchFormat, ScrimVisibility } from "@/lib/generated/prisma/enums";

export const scrimListingSchema = z.object({
  teamId: z.string().min(1),
  region: z.string().trim().max(60).optional().or(z.literal("")),
  skillTier: z.string().trim().max(60).optional().or(z.literal("")),
  format: z.enum(MatchFormat),
  proposedStart: z.string().min(1, "Date and time are required."),
  durationMinutes: z.coerce.number().int().min(15).max(600),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  visibility: z.enum(ScrimVisibility),
});

export const scrimRequestSchema = z.object({
  requestingTeamId: z.string().min(1, "Choose which of your teams is requesting."),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
  proposedStart: z.string().optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(15).max(600).optional(),
});
