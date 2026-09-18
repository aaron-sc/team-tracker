export const AUDIT_RETENTION_OPTIONS = [
  { value: "forever", label: "Forever", days: null },
  { value: "90", label: "90 days", days: 90 },
  { value: "180", label: "180 days", days: 180 },
  { value: "365", label: "1 year", days: 365 },
  { value: "730", label: "2 years", days: 730 },
] as const;
