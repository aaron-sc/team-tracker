// Release notes shown in the "What's new" dialog (components/layout/whats-new-dialog.tsx).
// Add a new entry at the TOP of this array as part of any deploy that ships user-facing
// changes — the dialog shows CHANGELOG[0] by default and pages back through older entries a
// returning visitor hasn't seen yet (see the dialog component for how "seen" is tracked).

export type ChangelogGroup = { title: string; items: string[] };
export type ChangelogEntry = {
  version: string;
  date: string;
  headline: string;
  groups: ChangelogGroup[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2026-09-07",
    date: "September 7, 2026",
    headline: "Legal pages, a real contact form, and SEO polish",
    groups: [
      {
        title: "Legal & privacy",
        items: [
          "A real Privacy Policy and Terms & Conditions, hosted right on Formation (not a third-party doc).",
          "A cookie consent banner — analytics only load after you accept.",
        ],
      },
      {
        title: "Getting in touch",
        items: [
          "A public Contact page with a real form — reach out without needing an account.",
          "A custom 404 page instead of a dead end when a link is wrong or outdated.",
        ],
      },
      {
        title: "Under the hood",
        items: [
          "5 FAQs added to the landing page, a sticky \"create your organization\" button on mobile, and better search-engine visibility (titles, descriptions, sitemap).",
        ],
      },
    ],
  },
  {
    version: "2026-09-04",
    date: "September 4, 2026",
    headline: "Strategy, playbooks, and match chat",
    groups: [
      {
        title: "Strategy & playbooks",
        items: [
          "Every team gets a strategy section — log a playbook entry per map, with an optional agent/role composition (works for Valorant, League, or anything else your game uses roles for).",
          "An upcoming match or practice shows that team's playbook as a quick-reference panel, organized by map, so nobody has to go dig through an old Discord thread to find the plan.",
        ],
      },
      {
        title: "Match & practice chat",
        items: [
          "A discussion thread now lives under every match and practice — talk through the game plan, confirm the veto, or coordinate right where the schedule already is.",
          "Both strategy and discussion are visible only to that team's own roster (plus coaches/managers who oversee multiple teams) — not the whole org.",
        ],
      },
    ],
  },
  {
    version: "2026-09-02",
    date: "September 2, 2026",
    headline: "The biggest update yet",
    groups: [
      {
        title: "Time & timezones",
        items: [
          "Every time now shows in 12-hour format by default (with AM/PM) — switch to 24-hour in Account settings.",
          "Times now note which timezone they're in, and setting your availability shows a live preview of how it'll look to your captain in the org's timezone.",
        ],
      },
      {
        title: "Scheduling & availability",
        items: [
          "Create a recurring weekly practice/scrim series in one step instead of one at a time.",
          "Schedule an announcement to publish later instead of only right away.",
          "Head-to-head opponent records, computed automatically from logged results.",
          "Suggested match/practice times, drawn from your team's recorded availability.",
          "A full hourly team availability heatmap.",
        ],
      },
      {
        title: "Player conduct",
        items: ["Bench and disciplinary records, visible only to coaches, managers, and owners."],
      },
      {
        title: "Rosters & recruitment",
        items: [
          "Player bios and per-game tracker links (Valorant, League of Legends, Rocket League, Smash Bros.).",
          "Game selection is now a dropdown everywhere — teams and recruitment prospects alike — no more typos or inconsistent data.",
        ],
      },
      {
        title: "Org branding & public site",
        items: [
          "Your org logo is clickable and links to your website.",
          "Public, customizable roster embeds — drop a live roster widget into your org's own website.",
        ],
      },
      {
        title: "Notifications",
        items: [
          "Browser push notifications, opt-in per device from the account page.",
          "Discord reminders now link straight back to the event in Formation.",
        ],
      },
      {
        title: "Calendar",
        items: ["Every member can now subscribe to their own personal calendar feed — no admin key needed."],
      },
      {
        title: "Discord bot",
        items: [
          "A full Discord bot: /link, /connect, /available, /roster, /schedule, /bench, /whoami.",
          "Interactive ✅ / ❌ RSVP buttons on reminders posted to a channel.",
          "Optional Discord role sync with a team's roster.",
          "Optional reminder delivery as a direct message.",
        ],
      },
      {
        title: "Game stats",
        items: ["Sync a League of Legends rank or Steam profile onto a player's roster profile."],
      },
      {
        title: "Team communication",
        items: ["Pinned team resource links.", "Team polls with live vote counts.", "Announcement read receipts."],
      },
      {
        title: "Analytics & engagement",
        items: [
          "A new Analytics page: org win rate, per-team performance, and attendance trends.",
          "Attendance streaks and a per-team attendance leaderboard.",
        ],
      },
      {
        title: "Admin tools",
        items: ["An equipment/gear inventory.", "A lightweight expense ledger."],
      },
      {
        title: "Design & docs",
        items: [
          "A modernized marketing page and smoother page transitions throughout the app.",
          "A full public docs site, plus a Terms of Service and Privacy Policy for the Discord bot.",
        ],
      },
      {
        title: "Security",
        items: [
          "Hardened security headers, rate limiting on login/signup/password-reset, and a real fix for a password-reset information leak.",
        ],
      },
    ],
  },
];

export function getLatestChangelogVersion(): string {
  return CHANGELOG[0]?.version ?? "";
}
