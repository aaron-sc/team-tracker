/** Table of contents for the user guide (app/guide/page.tsx) — one entry per <Section id="...">
 *  on the page. Shared between the page (which just needs the ids to exist) and GuideNav (which
 *  renders this list and scroll-spies it), so the two can never drift out of sync. */
export const GUIDE_GROUPS: { label: string; items: { id: string; label: string }[] }[] = [
  {
    label: "Getting started",
    items: [
      { id: "welcome", label: "Welcome" },
      { id: "roles-permissions", label: "Roles & permissions" },
    ],
  },
  {
    label: "Roster & teams",
    items: [
      { id: "roster", label: "Roster" },
      { id: "teams", label: "Teams & ranks" },
    ],
  },
  {
    label: "Scheduling",
    items: [
      { id: "schedule", label: "Schedule" },
      { id: "availability", label: "Availability" },
      { id: "venues", label: "Venues" },
      { id: "scrims", label: "Scrim Finder" },
    ],
  },
  {
    label: "Competing",
    items: [
      { id: "strategies", label: "Strategies" },
      { id: "recruitment", label: "Recruitment" },
      { id: "analytics", label: "Analytics" },
    ],
  },
  {
    label: "Communication",
    items: [
      { id: "announcements", label: "Announcements" },
      { id: "messages", label: "Messages" },
      { id: "notifications", label: "Notifications" },
    ],
  },
  {
    label: "Org operations",
    items: [
      { id: "onboarding", label: "Onboarding" },
      { id: "gear", label: "Gear" },
      { id: "expenses", label: "Expenses" },
    ],
  },
  {
    label: "Productivity",
    items: [
      { id: "search", label: "Search" },
      { id: "shortcuts", label: "Keyboard shortcuts" },
    ],
  },
  {
    label: "Settings",
    items: [
      { id: "org-profile", label: "Organization profile" },
      { id: "roles", label: "Roles" },
      { id: "members", label: "Members & invites" },
      { id: "audit-log", label: "Audit log" },
      { id: "integrations", label: "Discord & calendar" },
      { id: "api-access", label: "API access" },
    ],
  },
];
