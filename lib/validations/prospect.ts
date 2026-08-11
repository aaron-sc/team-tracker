import { z } from "zod";
import { ProspectStage } from "@/lib/generated/prisma/enums";

export const prospectSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(80),
  levelId: z.string().optional().or(z.literal("")),
  game: z.string().trim().min(1, "Game is required.").max(60),
  teamId: z.string().optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  discordHandle: z.string().trim().max(60).optional().or(z.literal("")),
  schoolOrOrg: z.string().trim().max(120).optional().or(z.literal("")),
  statsLinks: z.string().trim().max(2000).optional().or(z.literal("")),
  socialLinks: z.string().trim().max(2000).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const prospectLevelSchema = z.object({
  name: z.string().trim().min(1, "Level name is required.").max(40),
});

export const prospectStageSchema = z.object({
  stage: z.enum(ProspectStage),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});

/** Parses newline-separated "label | url" lines into a {label,url}[] for storage in Json fields. */
export function parseLinks(text: string): { label: string; url: string }[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, url] = line.split("|").map((s) => s.trim());
      return url ? { label, url } : { label: "Link", url: label };
    });
}

export function formatLinks(links: unknown): string {
  if (!Array.isArray(links)) return "";
  return links
    .map((l) => (l && typeof l === "object" && "label" in l && "url" in l ? `${l.label} | ${l.url}` : ""))
    .filter(Boolean)
    .join("\n");
}
