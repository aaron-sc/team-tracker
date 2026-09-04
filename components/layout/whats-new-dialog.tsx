"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { CHANGELOG, getLatestChangelogVersion } from "@/lib/changelog";

const SEEN_KEY = "formation-whats-new-seen";
const OPEN_EVENT = "formation:open-whats-new";

/** Call from anywhere (e.g. a "What's new" menu item) to reopen the dialog on demand, starting
 *  from the latest release. */
export function openWhatsNew() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/** How many entries (from the newest) a browser hasn't seen yet, based on the stored version.
 *  If the stored version isn't found at all (new browser, or storage was cleared), everything
 *  counts as unseen rather than nothing — the safer default for a "what changed" prompt. */
function countUnseen(seenVersion: string | null): number {
  if (!seenVersion) return CHANGELOG.length;
  const seenIndex = CHANGELOG.findIndex((entry) => entry.version === seenVersion);
  return seenIndex === -1 ? CHANGELOG.length : seenIndex;
}

/** Mounted once in the org layout. Auto-opens the first time a browser sees new release(s) —
 *  starting from the oldest one it hasn't seen, so a returning visitor reads forward in order —
 *  and reopens on demand via openWhatsNew(), starting from the latest. */
export function WhatsNewDialog() {
  const [open, setOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    function onOpenRequest() {
      setPageIndex(0);
      setOpen(true);
    }
    window.addEventListener(OPEN_EVENT, onOpenRequest);

    try {
      const seen = localStorage.getItem(SEEN_KEY);
      const unseenCount = countUnseen(seen);
      if (unseenCount > 0) {
        const timer = setTimeout(() => {
          setPageIndex(Math.min(unseenCount - 1, CHANGELOG.length - 1));
          setOpen(true);
        }, 500);
        return () => {
          clearTimeout(timer);
          window.removeEventListener(OPEN_EVENT, onOpenRequest);
        };
      }
    } catch {
      // Private browsing / storage blocked — just skip auto-open, manual "What's new" still works.
    }
    return () => window.removeEventListener(OPEN_EVENT, onOpenRequest);
  }, []);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      try {
        localStorage.setItem(SEEN_KEY, getLatestChangelogVersion());
      } catch {
        // Nothing to fall back to — worst case this shows again next visit.
      }
    }
  }

  const entry = CHANGELOG[pageIndex];
  if (!entry) return null;

  const isOldest = pageIndex >= CHANGELOG.length - 1;
  const isNewest = pageIndex <= 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden p-0">
        <DialogHeader className="border-b px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="size-5 text-primary" />
            {entry.headline}
          </DialogTitle>
          <DialogDescription>What&apos;s new in Formation — {entry.date}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[55vh] space-y-5 overflow-y-auto px-6 py-4">
          {entry.groups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-1.5 text-sm font-semibold">{group.title}</h3>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t px-6 py-4">
          {CHANGELOG.length > 1 ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isOldest}
                onClick={() => setPageIndex((i) => Math.min(i + 1, CHANGELOG.length - 1))}
                title="Older"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {pageIndex + 1} of {CHANGELOG.length}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isNewest}
                onClick={() => setPageIndex((i) => Math.max(i - 1, 0))}
                title="Newer"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          ) : (
            <span />
          )}
          <Button size="sm" onClick={() => handleOpenChange(false)}>
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
