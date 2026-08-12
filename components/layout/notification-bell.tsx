"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Bell, BellRing } from "lucide-react";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/lib/actions/notifications";
import { useDesktopNotificationPermission, showDesktopNotification } from "@/lib/notifications/desktop";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

export function NotificationBell({
  orgId,
  initialNotifications,
  initialUnreadCount,
}: {
  orgId: string;
  initialNotifications: Notification[];
  initialUnreadCount: number;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const { permission, request } = useDesktopNotificationPermission();
  const seenIds = useRef(new Set(initialNotifications.map((n) => n.id)));

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/notifications?orgId=${orgId}`);
        if (!res.ok) return;
        const data: { notifications: Notification[]; unreadCount: number } = await res.json();
        if (cancelled) return;

        for (const n of data.notifications) {
          if (!n.isRead && !seenIds.current.has(n.id)) {
            showDesktopNotification(n.title, { body: n.body ?? undefined, linkUrl: n.linkUrl ?? undefined, tag: n.id });
          }
        }
        seenIds.current = new Set(data.notifications.map((n) => n.id));

        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      } catch {
        // transient network error — next poll will retry
      }
    };
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") poll();
    }, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orgId]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {permission === "granted" ? <BellRing className="size-4" /> : <Bell className="size-4" />}
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 ? (
            <button
              type="button"
              className="text-xs text-primary underline underline-offset-4"
              onClick={async () => {
                setUnreadCount(0);
                setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
                await markAllNotificationsReadAction(orgId);
              }}
            >
              Mark all read
            </button>
          ) : null}
        </div>
        {permission === "default" ? (
          <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs text-muted-foreground">
            <span>Get desktop alerts for new notifications</span>
            <button
              type="button"
              className="shrink-0 font-medium text-primary underline underline-offset-4"
              onClick={() => request()}
            >
              Enable
            </button>
          </div>
        ) : null}
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            notifications.map((n) => {
              const content = (
                <div className="flex flex-col gap-0.5 px-2 py-2">
                  <div className="flex items-center gap-2">
                    {!n.isRead ? <span className="size-1.5 shrink-0 rounded-full bg-primary" /> : null}
                    <p className={cn("text-sm", n.isRead ? "text-muted-foreground" : "font-medium")}>{n.title}</p>
                  </div>
                  {n.body ? <p className="line-clamp-2 pl-3.5 text-xs text-muted-foreground">{n.body}</p> : null}
                </div>
              );

              const onClick = async () => {
                if (!n.isRead) {
                  setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
                  setUnreadCount((c) => Math.max(0, c - 1));
                  await markNotificationReadAction(orgId, n.id);
                }
              };

              return n.linkUrl ? (
                <Link key={n.id} href={n.linkUrl} onClick={onClick} className="block rounded-md hover:bg-accent">
                  {content}
                </Link>
              ) : (
                <button key={n.id} type="button" onClick={onClick} className="block w-full rounded-md text-left hover:bg-accent">
                  {content}
                </button>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
