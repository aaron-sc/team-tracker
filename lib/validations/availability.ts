import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const availabilityRuleGroupSchema = z
  .object({
    daysOfWeek: z
      .array(z.coerce.number().int().min(0).max(6))
      .min(1, "Select at least one day."),
    startTime: z.string().regex(timeRegex, "Invalid time."),
    endTime: z.string().regex(timeRegex, "Invalid time."),
    timezone: z.string().trim().min(1),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "Start time must be before end time.",
    path: ["endTime"],
  });

export const availabilityExceptionSchema = z
  .object({
    date: z.string().min(1, "Date is required."),
    isAvailable: z.coerce.boolean(),
    startTime: z.string().regex(timeRegex).optional().or(z.literal("")),
    endTime: z.string().regex(timeRegex).optional().or(z.literal("")),
    reason: z.string().trim().max(200).optional().or(z.literal("")),
  })
  .refine((data) => !data.startTime || !data.endTime || data.startTime < data.endTime, {
    message: "Start time must be before end time.",
    path: ["endTime"],
  });
