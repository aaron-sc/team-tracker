"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const CONSENT_KEY = "formation-cookie-consent";
export const CONSENT_EVENT = "formation:cookie-consent";

export type ConsentValue = "accepted" | "declined";

function setConsent(value: ConsentValue) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Storage blocked — the banner just won't remember the choice next visit.
  }
  window.dispatchEvent(new CustomEvent<ConsentValue>(CONSENT_EVENT, { detail: value }));
}

/** Mounted once in the root layout. Only ever gates analytics cookies — the session cookie that
 *  keeps you logged in is required for the app to work and isn't optional, so this banner is
 *  purely about the optional stuff (see components/marketing/google-analytics.tsx). */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
      } catch {
        // Storage blocked (private browsing, etc.) — skip the banner rather than show it forever.
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground">
          We use a required cookie to keep you logged in, and — only with your consent — analytics cookies to
          understand how Formation is used. See our{" "}
          <Link href="/privacy" className="text-foreground underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setConsent("declined");
              setVisible(false);
            }}
          >
            Decline
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setConsent("accepted");
              setVisible(false);
            }}
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
