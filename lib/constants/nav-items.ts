// Every navbar/sidebar item a user can individually hide (see NavbarCustomizeDialog, TopNav, and
// SidebarNav) — deliberately excludes the org switcher, logo, account menu, and Dashboard itself,
// since hiding those would strand someone with no way to get back into settings or land anywhere
// at all on their next visit.
export const NAV_ITEM_GROUPS: { label: string; items: string[] }[] = [
  {
    label: "Top navbar",
    items: ["search", "featureRequest", "roleBadge", "notifications", "shortcuts", "discord", "themeToggle"],
  },
  {
    label: "Left sidebar",
    items: [
      "sidebar_roster",
      "sidebar_teams",
      "sidebar_strategies",
      "sidebar_schedule",
      "sidebar_scrims",
      "sidebar_availability",
      "sidebar_analytics",
      "sidebar_venues",
      "sidebar_recruitment",
      "sidebar_announcements",
      "sidebar_messages",
      "sidebar_onboarding",
      "sidebar_gear",
      "sidebar_assets",
      "sidebar_expenses",
      "sidebar_settings",
    ],
  },
];

export const NAV_ITEM_LABELS: Record<string, string> = {
  search: "Search (Ctrl/⌘K)",
  featureRequest: "Suggest a feature",
  roleBadge: "Your role badge",
  notifications: "Notifications bell",
  shortcuts: "Keyboard shortcuts",
  discord: "Discord",
  themeToggle: "Theme toggle",
  sidebar_roster: "Roster",
  sidebar_teams: "Teams",
  sidebar_strategies: "Strategies",
  sidebar_schedule: "Schedule",
  sidebar_scrims: "Scrim Finder",
  sidebar_availability: "Availability",
  sidebar_analytics: "Analytics",
  sidebar_venues: "Venues",
  sidebar_recruitment: "Recruitment",
  sidebar_announcements: "Announcements",
  sidebar_messages: "Messages",
  sidebar_onboarding: "Onboarding",
  sidebar_gear: "Gear",
  sidebar_assets: "Assets",
  sidebar_expenses: "Expenses",
  sidebar_settings: "Settings",
};
