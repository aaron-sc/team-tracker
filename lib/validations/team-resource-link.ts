import { z } from "zod";

export const teamResourceLinkSchema = z.object({
  title: z.string().trim().min(1, "A title is required.").max(120),
  url: z.string().trim().url("Enter a valid URL, including https://").max(2000),
});
