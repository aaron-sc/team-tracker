"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { CONSENT_KEY, CONSENT_EVENT, type ConsentValue } from "@/components/marketing/cookie-consent-banner";

/** Loads GA4 only once both NEXT_PUBLIC_GA_MEASUREMENT_ID is configured and the visitor has
 *  accepted analytics cookies — never before, and it starts working immediately if they accept
 *  mid-session without needing a page reload. Renders nothing if the deployment hasn't set a
 *  measurement ID at all. */
export function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setConsented(localStorage.getItem(CONSENT_KEY) === ("accepted" satisfies ConsentValue));
      } catch {
        // Storage blocked — default to not-consented, the safer direction.
      }
    }, 0);
    function onConsent(e: Event) {
      setConsented((e as CustomEvent<ConsentValue>).detail === "accepted");
    }
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(CONSENT_EVENT, onConsent);
    };
  }, []);

  if (!measurementId || !consented) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
