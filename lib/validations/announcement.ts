import { z } from "zod";

export const announcementSchema = z.object({
  title: z.string().trim().min(2, "Title is required.").max(120),
  body: z.string().trim().min(1, "Body is required.").max(5000),
  teamId: z.string().optional().or(z.literal("")),
  pinned: z.coerce.boolean().default(false),
});
