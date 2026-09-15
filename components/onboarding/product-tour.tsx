"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { toast } from "sonner";

const TOUR_STORAGE_KEY = "formation-tour-completed";

const STEPS: DriveStep[] = [
  {
    element: '[data-tour="nav-dashboard"]',
    popover: {
      title: "Dashboard",
      description: "A snapshot of upcoming matches, practices, announcements, and team performance.",
    },
  },
  {
    element: '[data-tour="nav-roster"]',
    popover: {
      title: "Roster",
      description: "Your org's shared player pool — everyone who's part of the org, across every team.",
    },
  },
  {
    element: '[data-tour="nav-teams"]',
    popover: { title: "Teams", description: "Set up teams and build each one's roster from your org's members." },
  },
  {
    element: '[data-tour="nav-schedule"]',
    popover: {
      title: "Schedule",
      description: "Matches and practices on one calendar, with results and attendance tracked.",
    },
  },
  {
    element: '[data-tour="nav-recruitment"]',
    popover: { title: "Recruitment", description: "Track prospects through a pipeline from scouting to signed." },
  },
  {
    element: '[data-tour="nav-messages"]',
    popover: { title: "Messages", description: "Message any teammate directly, one on one." },
  },
  {
    element: '[data-tour="nav-settings"]',
    popover: {
      title: "Settings",
      description: "Invite teammates, manage roles and permissions, and configure integrations.",
    },
  },
  {
    element: '[data-tour="search"]',
    popover: { title: "Search", description: "Press Ctrl/Cmd+K anywhere to jump straight to a member, team, or venue." },
  },
  {
    element: '[data-tour="notifications"]',
    popover: { title: "Notifications", description: "New messages, invite acceptances, and updates show up here." },
  },
  {
    element: '[data-tour="user-menu"]',
    popover: { title: "Your account", description: "Switch organizations, manage your account, or log out." },
  },
];

// No `element` — renders as a plain centered popover instead of highlighting something on the
// dashboard, since linking Discord actually happens on a different page (Account). Players are
// the ones who get real value out of it day to day: DM reminders, and slash commands like
// /available, /roster, and /schedule without leaving Discord — so it's appended only for them,
// not every role, to keep the tour from feeling like it doesn't apply to a coach or manager.
const PLAYER_DISCORD_STEP: DriveStep = {
  popover: {
    title: "Link your Discord",
    description:
      'One more thing — connect your Discord account from <a href="/account#connect-discord">Account settings</a> to get reminders as a DM and use commands like <code>/available</code> right from Discord.',
  },
};

function isVisible(selector: string): boolean {
  const el = document.querySelector(selector);
  // offsetParent is null for display:none elements (e.g. the sidebar is
  // hidden below the sm breakpoint) — existence alone isn't enough.
  return el instanceof HTMLElement && el.offsetParent !== null;
}

function buildDriver(roleName?: string, { showReplayHint = false }: { showReplayHint?: boolean } = {}) {
  const steps = STEPS.filter((s) => typeof s.element === "string" && isVisible(s.element));
  if (roleName === "Player") steps.push(PLAYER_DISCORD_STEP);

  return driver({
    showProgress: true,
    allowClose: true,
    steps,
    onDestroyed: () => {
      localStorage.setItem(TOUR_STORAGE_KEY, "1");
      // Only on the auto-started run — someone who just replayed it manually (from the profile
      // menu) doesn't need to be told where the menu item lives.
      if (showReplayHint) {
        toast("You can take this tour again anytime — click your profile in the top right, then \"Take a tour.\"");
      }
    },
  });
}

/** Manual replay — call from anywhere (e.g. the "Take a tour" menu item). `roleName` decides
 *  whether the Discord step is included, same as the auto-start version below. */
export function startProductTour(roleName?: string) {
  buildDriver(roleName).drive();
}

/** Mounted once in the org layout; auto-starts on first dashboard visit. */
export function ProductTourAutoStart({ roleName }: { roleName?: string }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.endsWith("/dashboard")) return;
    if (localStorage.getItem(TOUR_STORAGE_KEY)) return;
    const timer = setTimeout(() => buildDriver(roleName, { showReplayHint: true }).drive(), 600);
    return () => clearTimeout(timer);
  }, [pathname, roleName]);

  return null;
}
