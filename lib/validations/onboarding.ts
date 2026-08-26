import { z } from "zod";

export const onboardingTaskTypeSchema = z.enum(["ACKNOWLEDGE", "DOCUMENT", "LINK", "VIDEO", "SIGNATURE"]);

export const onboardingTaskSchema = z
  .object({
    title: z.string().trim().min(2, "Title must be at least 2 characters.").max(120),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    type: onboardingTaskTypeSchema,
    url: z.string().trim().url("Enter a valid URL.").max(500).optional().or(z.literal("")),
    body: z.string().trim().max(20000).optional().or(z.literal("")),
    required: z.boolean().default(true),
  })
  .refine((data) => data.type !== "LINK" && data.type !== "VIDEO" ? true : !!data.url, {
    message: "A link or video task needs a URL.",
    path: ["url"],
  })
  .refine((data) => (data.type !== "SIGNATURE" ? true : !!data.body), {
    message: "A signature task needs document text for people to sign.",
    path: ["body"],
  });

export const completeTaskSchema = z.object({
  signatureName: z.string().trim().max(120).optional().or(z.literal("")),
});
