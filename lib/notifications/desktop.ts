"use client";

import { useCallback, useEffect, useState } from "react";

export function useDesktopNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    // Notification.permission is browser-only and can differ from the SSR
    // default, so it's read post-mount (not during render) to avoid a
    // hydration mismatch — the one case this sync setState is required.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPermission(typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported");
  }, []);

  const request = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  return { permission, request };
}

/** Fires a native OS notification if permission was granted; no-ops otherwise (never throws). */
export function showDesktopNotification(title: string, options?: NotificationOptions & { linkUrl?: string }) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, options);
    n.onclick = () => {
      window.focus();
      if (options?.linkUrl) window.location.href = options.linkUrl;
      n.close();
    };
  } catch {
    // Some browsers throw on `new Notification` in edge cases even when permission is granted.
  }
}
