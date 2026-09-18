"use client";

import { useTransition } from "react";
import { deleteEventTypeAction } from "@/lib/actions/event-types";
import { EventTypeFormDialog } from "@/components/settings/event-type-form-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, CalendarDays } from "lucide-react";

type EventType = { id: string; name: string; trackAttendance: boolean; sessionCount: number };

export function EventTypeRow({ orgSlug, orgId, eventType }: { orgSlug: string; orgId: string; eventType: EventType }) {
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium">
              {eventType.name}
              {eventType.trackAttendance ? (
                <Badge variant="outline">Attendance tracked</Badge>
              ) : (
                <Badge variant="outline">No attendance tracking</Badge>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {eventType.sessionCount} event{eventType.sessionCount === 1 ? "" : "s"} scheduled
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <EventTypeFormDialog
            orgSlug={orgSlug}
            orgId={orgId}
            eventTypeId={eventType.id}
            defaultValues={{ name: eventType.name, trackAttendance: eventType.trackAttendance }}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            onClick={() => {
              if (!confirm(`Delete "${eventType.name}"? Past events of this type keep their history but lose this label.`)) return;
              startTransition(async () => {
                const result = await deleteEventTypeAction(orgSlug, orgId, eventType.id);
                if (result?.error) toast.error(result.error);
              });
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
