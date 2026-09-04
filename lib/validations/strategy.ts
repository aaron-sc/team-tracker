import { z } from "zod";

export const strategyAgentRowSchema = z.object({
  role: z.string().trim().max(40),
  agent: z.string().trim().max(40),
});

export const strategySchema = z.object({
  map: z.string().trim().min(1, "A map is required.").max(60),
  title: z.string().trim().min(1, "A title is required.").max(120),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
  agents: z.array(strategyAgentRowSchema).max(10).optional(),
});
