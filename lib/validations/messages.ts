import { z } from "zod";

export const messageSchema = z.object({
  body: z.string().trim().min(1, "Message can't be empty.").max(4000),
});
