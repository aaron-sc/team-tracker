export const REMINDER_MINUTES_VALUES = ["off", "5", "10", "15", "30", "60", "120", "1440"] as const;

export const REMINDER_MINUTES_OPTIONS: { value: (typeof REMINDER_MINUTES_VALUES)[number]; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "5", label: "5 minutes before" },
  { value: "10", label: "10 minutes before" },
  { value: "15", label: "15 minutes before" },
  { value: "30", label: "30 minutes before" },
  { value: "60", label: "1 hour before" },
  { value: "120", label: "2 hours before" },
  { value: "1440", label: "1 day before" },
];
