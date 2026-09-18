"use client";

import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";

const DISMISSED_KEY = "formation-dismissed-announcement";

/** Top-of-app banner for messages pushed from the hub admin console (see
 *  app/api/internal/admin-broadcast) — e.g. planned maintenance. Dismissal is keyed by the
 *  announcement's id, so clearing an old one never hides a newer one from returning. */
export function PlatformAnnouncementBanner({ id, message }: { id: string; message: string }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setDismissed(localStorage.getItem(DISMISSED_KEY) === id);
      } catch {
        setDismissed(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [id]);

  if (dismissed) return null;

  return (
    <div className="no-print flex items-center justify-between gap-3 bg-amber-500/15 px-4 py-2 text-sm text-amber-900 dark:text-amber-300">
      <div className="flex items-center gap-2">
        <Megaphone className="size-4 shrink-0" />
        <span>{message}</span>
      </div>
      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          try {
            localStorage.setItem(DISMISSED_KEY, id);
          } catch {
            // Private browsing / storage blocked — the banner will just reappear on next visit.
          }
        }}
        className="shrink-0 rounded p-1 hover:bg-amber-500/20"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
