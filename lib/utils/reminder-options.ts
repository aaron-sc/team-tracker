export const REMINDER_MINUTES_VALUES = ["5", "10", "15", "30", "60", "120", "1440"] as const;

export const REMINDER_MINUTES_OPTIONS: { value: (typeof REMINDER_MINUTES_VALUES)[number]; label: string }[] = [
  { value: "5", label: "5 minutes before" },
  { value: "10", label: "10 minutes before" },
  { value: "15", label: "15 minutes before" },
  { value: "30", label: "30 minutes before" },
  { value: "60", label: "1 hour before" },
  { value: "120", label: "2 hours before" },
  { value: "1440", label: "1 day before" },
];

/** Team.discordMatchReminderMinutes (etc.) ride as Json since SQLite has no scalar-list type —
 *  this turns whatever Prisma hands back into a clean, deduped, sorted number[] (or [] for
 *  null/garbage), the shape every reminder call site actually wants to work with. */
export function parseReminderMinutesList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const nums = value.filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0);
  return [...new Set(nums)].sort((a, b) => a - b);
}
