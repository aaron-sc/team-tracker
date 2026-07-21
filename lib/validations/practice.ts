import { z } from "zod";
import { SessionType, LocationType } from "@/lib/generated/prisma/enums";

export const practiceSessionSchema = z
  .object({
    teamId: z.string().min(1),
    type: z.enum(SessionType),
    opponentId: z.string().optional().or(z.literal("")),
    newOpponentName: z.string().trim().max(80).optional().or(z.literal("")),
    scheduledAt: z.string().min(1, "Date and time are required."),
    durationMinutes: z.coerce.number().int().min(15).max(600),
    locationType: z.enum(LocationType),
    venueId: z.string().optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .refine((data) => data.type !== "SCRIM" || data.opponentId || data.newOpponentName, {
    message: "Choose an opponent for a scrim.",
    path: ["opponentId"],
  })
  .refine((data) => data.locationType !== "LAN" || data.venueId, {
    message: "Choose a venue for LAN sessions.",
    path: ["venueId"],
  });

export const attendanceStatusSchema = z.enum([
  "INVITED",
  "CONFIRMED",
  "DECLINED",
  "ATTENDED",
  "ABSENT",
  "LATE",
]);
