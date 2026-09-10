"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { GUIDE_GROUPS } from "@/lib/constants/guide-sections";

const ALL_IDS = GUIDE_GROUPS.flatMap((g) => g.items.map((i) => i.id));

/** Sticky table of contents for the user guide. Highlights whichever section is currently
 *  scrolled to the top of the viewport — the same "always know where you are" job the app's own
 *  sidebar does for the product, just for this one long page. */
export function GuideNav() {
  const [activeId, setActiveId] = useState<string>(ALL_IDS[0]);

  useEffect(() => {
    // A section is "active" once its heading has scrolled up past a line near the top of the
    // viewport — walk the sections in order and take the last one that's crossed it. (Comparing
    // raw intersection ratios instead falls apart here: a long section's tail end and a short
    // section's start can both be "intersecting" a naive top band at once, and picking between
    // them by which has the smaller — i.e. more negative — top biases toward whichever section is
    // scrolled furthest past, not whichever is actually on screen.)
    const THRESHOLD = 120;
    function updateActive() {
      // The very last section usually can't scroll flush past the threshold line at all — there's
      // not enough trailing page content left to push it that far up — so it would otherwise never
      // register as active no matter how far down you scroll. Once the page is scrolled as far as
      // it goes, just call that one active.
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1;
      if (atBottom) {
        setActiveId(ALL_IDS[ALL_IDS.length - 1]);
        return;
      }
      let current = ALL_IDS[0];
      for (const id of ALL_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= THRESHOLD) current = id;
      }
      setActiveId(current);
    }
    updateActive();
    window.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);
    return () => {
      window.removeEventListener("scroll", updateActive);
      window.removeEventListener("resize", updateActive);
    };
  }, []);

  // The list itself scrolls independently on a shorter screen (it's taller than the viewport
  // allows) — keep whichever link is active in view within it, the same way an app sidebar
  // wouldn't let its own current-page highlight sit scrolled out of sight.
  useEffect(() => {
    document.querySelector(`[data-guide-nav-id="${activeId}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  return (
    <nav aria-label="Guide sections" className="space-y-5 text-sm">
      {GUIDE_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  data-guide-nav-id={item.id}
                  // Set eagerly on click rather than waiting for the scroll-spy to catch up — a
                  // section near the very bottom of the page can't always scroll flush to the top
                  // (there's not enough content left below it), which would otherwise leave a
                  // just-clicked link unhighlighted even though it's exactly where the user asked
                  // to go.
                  onClick={() => setActiveId(item.id)}
                  className={cn(
                    "block rounded-md px-2 py-1.5 transition-colors",
                    activeId === item.id
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Same list, flattened into a horizontal scroller — the mobile stand-in below the lg breakpoint,
 *  where there's no room for a persistent side column (mirrors how MobileNav stands in for
 *  SidebarNav). No scroll-spy here; a phone user picks a topic and jumps, they don't watch it
 *  update while skimming. */
export function GuideNavMobile() {
  return (
    <nav aria-label="Guide sections" className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
      {ALL_IDS.map((id) => {
        const label = GUIDE_GROUPS.flatMap((g) => g.items).find((i) => i.id === id)?.label ?? id;
        return (
          <a
            key={id}
            href={`#${id}`}
            className="shrink-0 rounded-full border bg-background px-3 py-1.5 text-xs font-medium whitespace-nowrap text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            {label}
          </a>
        );
      })}
    </nav>
  );
}
