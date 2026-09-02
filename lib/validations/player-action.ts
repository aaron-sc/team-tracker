import { z } from "zod";

export const playerActionTypeSchema = z.enum(["BENCHED", "DISCIPLINARY"]);

export const playerActionSchema = z
  .object({
    type: playerActionTypeSchema,
    reason: z.string().trim().min(2, "A reason is required.").max(2000),
    startDate: z.string().trim().max(10).optional().or(z.literal("")),
    endDate: z.string().trim().max(10).optional().or(z.literal("")),
  })
  .refine((data) => !data.endDate || !!data.startDate, {
    message: "An end date needs a start date.",
    path: ["startDate"],
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
    message: "End date can't be before the start date.",
    path: ["endDate"],
  });
