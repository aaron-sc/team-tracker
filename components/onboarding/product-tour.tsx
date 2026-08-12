"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

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

function isVisible(selector: string): boolean {
  const el = document.querySelector(selector);
  // offsetParent is null for display:none elements (e.g. the sidebar is
  // hidden below the sm breakpoint) — existence alone isn't enough.
  return el instanceof HTMLElement && el.offsetParent !== null;
}

function buildDriver() {
  return driver({
    showProgress: true,
    allowClose: true,
    steps: STEPS.filter((s) => typeof s.element === "string" && isVisible(s.element)),
    onDestroyed: () => {
      localStorage.setItem(TOUR_STORAGE_KEY, "1");
    },
  });
}

/** Manual replay — call from anywhere (e.g. the "Take a tour" menu item). */
export function startProductTour() {
  buildDriver().drive();
}

/** Mounted once in the org layout; auto-starts on first dashboard visit. */
export function ProductTourAutoStart() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.endsWith("/dashboard")) return;
    if (localStorage.getItem(TOUR_STORAGE_KEY)) return;
    const timer = setTimeout(() => startProductTour(), 600);
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
