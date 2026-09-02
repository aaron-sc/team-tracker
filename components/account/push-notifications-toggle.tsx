"use client";

import { useEffect, useState, useTransition } from "react";
import { savePushSubscriptionAction, deletePushSubscriptionAction } from "@/lib/actions/push-notifications";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bell, BellOff, Loader2 } from "lucide-react";

type Status = "checking" | "unsupported" | "no-key" | "enabled" | "disabled" | "denied";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushNotificationsToggle() {
  const [status, setStatus] = useState<Status>("checking");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        setStatus("no-key");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const existing = await registration?.pushManager.getSubscription();
      setStatus(existing ? "enabled" : "disabled");
    }
    check().catch(() => setStatus("unsupported"));
  }, []);

  function enable() {
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "denied" : "disabled");
          return;
        }
        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as BufferSource,
        });
        const json = subscription.toJSON();
        const result = await savePushSubscriptionAction({
          endpoint: json.endpoint!,
          keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
        });
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success(result?.success ?? "Enabled.");
        setStatus("enabled");
      } catch {
        toast.error("Couldn't enable push notifications on this device.");
      }
    });
  }

  function disable() {
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration("/sw.js");
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          const endpoint = subscription.endpoint;
          await subscription.unsubscribe();
          const result = await deletePushSubscriptionAction(endpoint);
          if (result?.error) toast.error(result.error);
          else toast.success(result?.success ?? "Disabled.");
        }
        setStatus("disabled");
      } catch {
        toast.error("Couldn't disable push notifications on this device.");
      }
    });
  }

  if (status === "checking") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Checking this browser…
      </p>
    );
  }

  if (status === "unsupported") {
    return <p className="text-sm text-muted-foreground">Not supported in this browser.</p>;
  }

  if (status === "no-key") {
    return <p className="text-sm text-muted-foreground">Push notifications aren&apos;t configured for this deployment.</p>;
  }

  if (status === "denied") {
    return (
      <p className="text-sm text-muted-foreground">
        Blocked at the browser level — allow notifications for this site in your browser settings to enable.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <p className="text-sm text-muted-foreground">
        {status === "enabled" ? "Enabled on this device." : "Get reminders and updates as browser notifications, even when Formation isn't open."}
      </p>
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={status === "enabled" ? disable : enable}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : status === "enabled" ? (
          <BellOff className="size-4" />
        ) : (
          <Bell className="size-4" />
        )}
        {status === "enabled" ? "Disable" : "Enable"}
      </Button>
    </div>
  );
}
