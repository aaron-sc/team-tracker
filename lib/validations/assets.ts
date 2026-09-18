import { z } from "zod";

export const assetCategorySchema = z.enum(["BANNER", "MERCH", "GRAPHIC", "LOGO", "TEMPLATE", "OTHER"]);

export const assetSchema = z.object({
  title: z.string().trim().min(1, "A title is required.").max(120),
  category: assetCategorySchema,
  teamId: z.string().trim().max(60).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
