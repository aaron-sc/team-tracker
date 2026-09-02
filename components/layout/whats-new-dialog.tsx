"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { CHANGELOG, getLatestChangelogVersion } from "@/lib/changelog";

const SEEN_KEY = "formation-whats-new-seen";
const OPEN_EVENT = "formation:open-whats-new";

/** Call from anywhere (e.g. a "What's new" menu item) to reopen the dialog on demand. */
export function openWhatsNew() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/** Mounted once in the org layout. Auto-opens the first time a browser sees a new version,
 *  and reopens on demand via openWhatsNew(). */
export function WhatsNewDialog() {
  const [open, setOpen] = useState(false);
  const latest = CHANGELOG[0];

  useEffect(() => {
    const onOpenRequest = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpenRequest);

    try {
      const seen = localStorage.getItem(SEEN_KEY);
      if (seen !== getLatestChangelogVersion()) {
        const timer = setTimeout(() => setOpen(true), 500);
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

  if (!latest) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden p-0">
        <DialogHeader className="border-b px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="size-5 text-primary" />
            {latest.headline}
          </DialogTitle>
          <DialogDescription>What&apos;s new in Formation — {latest.date}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-5 overflow-y-auto px-6 py-4">
          {latest.groups.map((group) => (
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
        <div className="flex justify-end border-t px-6 py-4">
          <Button size="sm" onClick={() => handleOpenChange(false)}>
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
