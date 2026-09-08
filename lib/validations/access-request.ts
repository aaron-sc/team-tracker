import { z } from "zod";

export const ACCESS_REQUEST_ROLES = ["owner", "manager", "coach", "other"] as const;
export const ROSTER_SIZE_BUCKETS = ["Just me", "2–10", "11–30", "31–75", "75+"] as const;

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const accessRequestSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  role: z.enum(ACCESS_REQUEST_ROLES, { message: "Pick your role." }),
  orgName: z.string().trim().min(2, "Enter your organization's name.").max(80),
  websiteUrl: z
    .string()
    .trim()
    .url("Enter a full URL, including https://.")
    .max(200)
    .optional()
    .or(z.literal("")),
  discordInvite: optionalText(200),
  games: z.string().trim().min(2, "Which game(s) do you run teams for?").max(200),
  rosterSize: z.enum(ROSTER_SIZE_BUCKETS).optional().or(z.literal("")),
  reason: z.string().trim().min(20, "A sentence or two about why, please.").max(2000),
  referral: optionalText(200),
});

export type AccessRequestInput = z.infer<typeof accessRequestSchema>;
