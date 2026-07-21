import { z } from "zod";
import { MatchFormat, LocationType, MatchStatus, ResultStatus } from "@/lib/generated/prisma/enums";

export const matchSchema = z
  .object({
    teamId: z.string().min(1),
    opponentId: z.string().optional().or(z.literal("")),
    newOpponentName: z.string().trim().max(80).optional().or(z.literal("")),
    scheduledAt: z.string().min(1, "Date and time are required."),
    format: z.enum(MatchFormat),
    locationType: z.enum(LocationType),
    venueId: z.string().optional().or(z.literal("")),
    isStreamed: z.coerce.boolean().default(false),
    streamPlatform: z.string().trim().max(40).optional().or(z.literal("")),
    streamUrl: z.string().trim().url().optional().or(z.literal("")),
    casterName: z.string().trim().max(80).optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .refine((data) => data.opponentId || data.newOpponentName, {
    message: "Choose an opponent or enter a new one.",
    path: ["opponentId"],
  })
  .refine((data) => data.locationType !== "LAN" || data.venueId, {
    message: "Choose a venue for LAN matches.",
    path: ["venueId"],
  });

export const matchResultSchema = z.object({
  status: z.enum(MatchStatus),
  resultStatus: z.enum(ResultStatus).optional().or(z.literal("")),
  scoreFor: z.coerce.number().int().min(0).optional().or(z.literal("")),
  scoreAgainst: z.coerce.number().int().min(0).optional().or(z.literal("")),
});
