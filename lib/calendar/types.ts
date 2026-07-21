export type CalendarEvent = {
  id: string;
  type: "match" | "practice";
  title: string;
  subtitle?: string;
  start: Date;
  end: Date;
  href: string;
};
