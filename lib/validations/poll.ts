import { z } from "zod";

export const createPollSchema = z.object({
  question: z.string().trim().min(2, "A question is required.").max(300),
  options: z
    .array(z.string().trim().min(1).max(120))
    .min(2, "Add at least 2 options.")
    .max(10, "10 options max."),
  closesAt: z.string().trim().max(30).optional().or(z.literal("")),
});
