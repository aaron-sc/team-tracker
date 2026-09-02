import { z } from "zod";

export const gearStatusSchema = z.enum(["AVAILABLE", "ASSIGNED", "MAINTENANCE", "LOST", "RETIRED"]);

export const gearItemSchema = z.object({
  name: z.string().trim().min(1, "A name is required.").max(120),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  serialNumber: z.string().trim().max(120).optional().or(z.literal("")),
  status: gearStatusSchema,
  assignedToMembershipId: z.string().trim().max(60).optional().or(z.literal("")),
  assignedToTeamId: z.string().trim().max(60).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
