"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { isTypingTarget } from "@/lib/utils/keyboard";

const DESTINATIONS: Record<string, string> = {
  r: "roster",
  t: "teams",
  s: "schedule",
  d: "dashboard",
};

const CHORD_WINDOW_MS = 600;

/** `g` followed by `r`/`t`/`s`/`d` within 600ms navigates to roster/teams/schedule/dashboard —
 *  a Gmail-style two-key chord, documented in KeyboardShortcutsDialog. */
export function KeyboardNav({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const armedAt = useRef<number | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();

      if (key === "g") {
        armedAt.current = Date.now();
        return;
      }

      const armed = armedAt.current !== null && Date.now() - armedAt.current < CHORD_WINDOW_MS;
      armedAt.current = null;
      if (!armed) return;

      const destination = DESTINATIONS[key];
      if (!destination) return;
      e.preventDefault();
      router.push(`/${orgSlug}/${destination}`);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [orgSlug, router]);

  return null;
}
