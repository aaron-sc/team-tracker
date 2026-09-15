"use client";

import { useState, useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/actions/types";

/** Lets a manager/coach add someone from the team's current roster to a specific match/practice's
 *  attendance list after the fact — the list is only auto-populated once, at creation time, so
 *  this covers a substitute or anyone who joined the roster since. `candidates` should already
 *  exclude anyone already on the attendance list. */
export function AddAttendeeControl({
  candidates,
  onAdd,
}: {
  candidates: { membershipId: string; name: string }[];
  onAdd: (membershipId: string) => Promise<ActionState>;
}) {
  const [selected, setSelected] = useState("");
  const [pending, startTransition] = useTransition();

  if (candidates.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger size="sm" className="w-40">
          <SelectValue placeholder="Add player…" />
        </SelectTrigger>
        <SelectContent>
          {candidates.map((c) => (
            <SelectItem key={c.membershipId} value={c.membershipId}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!selected || pending}
        onClick={() => {
          startTransition(async () => {
            const result = await onAdd(selected);
            if (result?.error) toast.error(result.error);
            else setSelected("");
          });
        }}
      >
        <UserPlus className="size-4" />
        Add
      </Button>
    </div>
  );
}
