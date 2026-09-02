import { z } from "zod";

export const expenseSchema = z.object({
  category: z.string().trim().min(1, "A category is required.").max(60),
  description: z.string().trim().min(1, "A description is required.").max(300),
  amount: z.coerce.number().positive("Enter an amount greater than 0.").max(10_000_000),
  incurredAt: z.string().trim().min(1, "A date is required.").max(10),
  teamId: z.string().trim().max(60).optional().or(z.literal("")),
});
