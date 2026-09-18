"use client";

import { useActionState, useState } from "react";
import { parseIcsFilesAction, importIcsSessionsAction, type ParseIcsState } from "@/lib/actions/ics-import";
import type { ActionState } from "@/lib/actions/types";
import type { ParsedIcsEvent } from "@/lib/calendar/ics-import";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SubmitButton } from "@/components/auth/submit-button";
import { toDatetimeLocalValue } from "@/lib/utils/format-time";

type Row = { include: boolean; title: string; start: string; durationMinutes: number };

export function IcsImportWizard({
  orgSlug,
  orgId,
  teams,
  eventTypes,
  orgTimezone,
}: {
  orgSlug: string;
  orgId: string;
  teams: { id: string; name: string }[];
  eventTypes: { id: string; name: string }[];
  orgTimezone: string;
}) {
  const parseAction = parseIcsFilesAction.bind(null, orgId);
  const [parseState, parseFormAction] = useActionState<ParseIcsState, FormData>(parseAction, undefined);

  const importAction = importIcsSessionsAction.bind(null, orgSlug, orgId);
  const [importState, importFormAction] = useActionState<ActionState, FormData>(importAction, undefined);

  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [type, setType] = useState<"PRACTICE" | "SCRIM" | "EVENT">("PRACTICE");
  const [eventTypeId, setEventTypeId] = useState(eventTypes[0]?.id ?? "");
  const [rows, setRows] = useState<Row[] | null>(null);
  // Tracks which parseState we've already turned into editable rows, so a fresh set of parsed
  // events (re-running "Parse file(s)") seeds `rows` exactly once — adjusted during render per
  // React's own pattern for this, rather than a useEffect+setState (which the lint rule flags as
  // an unnecessary extra render).
  const [seenEvents, setSeenEvents] = useState<ParsedIcsEvent[] | null>(null);
  if (parseState && "events" in parseState && parseState.events !== seenEvents) {
    setSeenEvents(parseState.events);
    setRows(
      parseState.events.map((e) => ({
        include: true,
        title: e.title,
        start: toDatetimeLocalValue(new Date(e.start), orgTimezone),
        durationMinutes: e.durationMinutes,
      })),
    );
  }

  if (!rows) {
    return (
      <form action={parseFormAction} className="max-w-xl space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="teamId">Team</Label>
          <Select name="teamId" value={teamId} onValueChange={setTeamId}>
            <SelectTrigger id="teamId" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Every imported event goes to this team — pick each file&apos;s team/type once here rather than per event.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="type">Import as</Label>
          <Select name="type" value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger id="type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PRACTICE">Internal practice</SelectItem>
              <SelectItem value="SCRIM">Scrim</SelectItem>
              <SelectItem value="EVENT">Other event</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {type === "EVENT" ? (
          <div className="space-y-1.5">
            <Label htmlFor="eventTypeId">Event type</Label>
            {eventTypes.length > 0 ? (
              <Select name="eventTypeId" value={eventTypeId} onValueChange={setEventTypeId}>
                <SelectTrigger id="eventTypeId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((et) => (
                    <SelectItem key={et.id} value={et.id}>
                      {et.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                No event types set up yet —{" "}
                <a href={`/${orgSlug}/settings/event-types`} className="text-primary underline underline-offset-4">
                  add one in Settings
                </a>{" "}
                first.
              </p>
            )}
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="files">.ics file(s)</Label>
          <Input id="files" name="files" type="file" accept=".ics,text/calendar" multiple required />
          <p className="text-xs text-muted-foreground">
            Upload one or more calendar files — every event across all of them lands in one review list next.
          </p>
        </div>
        {parseState && "error" in parseState ? <p className="text-sm text-destructive">{parseState.error}</p> : null}
        <SubmitButton>Parse file(s)</SubmitButton>
      </form>
    );
  }

  const includedCount = rows.filter((r) => r.include).length;

  return (
    <form
      action={(formData) => {
        formData.set("teamId", teamId);
        formData.set("type", type);
        if (type === "EVENT") formData.set("eventTypeId", eventTypeId);
        formData.set("events", JSON.stringify(rows.filter((r) => r.include).map((r) => ({ ...r, start: r.start }))));
        importFormAction(formData);
      }}
      className="space-y-4"
    >
      <p className="text-sm text-muted-foreground">
        Review the {rows.length} event{rows.length === 1 ? "" : "s"} found — uncheck any you don&apos;t want, and adjust
        titles/times as needed. Each original title is kept as the session&apos;s note.
      </p>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead />
              <TableHead>Title</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>Duration (min)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i} className={row.include ? undefined : "opacity-50"}>
                <TableCell>
                  <Checkbox
                    checked={row.include}
                    onCheckedChange={(v) =>
                      setRows((prev) => prev!.map((r, idx) => (idx === i ? { ...r, include: !!v } : r)))
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={row.title}
                    onChange={(e) => setRows((prev) => prev!.map((r, idx) => (idx === i ? { ...r, title: e.target.value } : r)))}
                    className="min-w-48"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="datetime-local"
                    value={row.start}
                    onChange={(e) => setRows((prev) => prev!.map((r, idx) => (idx === i ? { ...r, start: e.target.value } : r)))}
                    className="min-w-48"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={15}
                    step={15}
                    value={row.durationMinutes}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev!.map((r, idx) => (idx === i ? { ...r, durationMinutes: Number(e.target.value) || 60 } : r)),
                      )
                    }
                    className="w-24"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {importState?.error ? <p className="text-sm text-destructive">{importState.error}</p> : null}
      <div className="flex gap-2">
        <SubmitButton disabled={includedCount === 0}>
          Import {includedCount} event{includedCount === 1 ? "" : "s"}
        </SubmitButton>
        <button
          type="button"
          onClick={() => setRows(null)}
          className="text-sm text-muted-foreground underline underline-offset-4"
        >
          Start over
        </button>
      </div>
    </form>
  );
}
