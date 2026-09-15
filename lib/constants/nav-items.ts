// Every navbar icon a user can individually hide (see NavbarCustomizeDialog and TopNav) —
// deliberately excludes the org switcher, logo, and account menu, since hiding those would strand
// someone with no way to get back into settings to re-show anything.
export const NAV_ITEM_LABELS: Record<string, string> = {
  search: "Search (Ctrl/⌘K)",
  featureRequest: "Suggest a feature",
  roleBadge: "Your role badge",
  notifications: "Notifications bell",
  shortcuts: "Keyboard shortcuts",
  discord: "Discord",
  themeToggle: "Theme toggle",
};
