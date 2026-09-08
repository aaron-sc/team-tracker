"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { CONSENT_KEY, CONSENT_EVENT } from "@/components/marketing/cookie-consent-banner";

/** Mobile-only — on a small screen the primary CTA in the hero scrolls out of view almost
 *  immediately, so this keeps it one thumb-reach away the whole time. Hidden at the sm breakpoint
 *  and up, where the hero CTA stays reachable enough on its own.
 *
 *  Both this and the cookie consent banner anchor to the same bottom edge, so this stays hidden
 *  until that banner has been dismissed (accepted or declined) — first-time visitors see the
 *  consent choice front and center; everyone else gets the CTA. */
export function StickyMobileCta() {
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setBannerDismissed(!!localStorage.getItem(CONSENT_KEY));
      } catch {
        // Storage blocked — default to showing the CTA rather than hiding it forever.
        setBannerDismissed(true);
      }
    }, 0);
    function onConsent() {
      setBannerDismissed(true);
    }
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(CONSENT_EVENT, onConsent);
    };
  }, []);

  if (!bannerDismissed) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:hidden">
      <Button className="w-full" asChild>
        <Link href="/signup">
          Create your organization
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
