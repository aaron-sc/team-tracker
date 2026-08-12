"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RuleGroupForm } from "@/components/availability/rule-group-form";
import { saveAvailabilityRuleGroupAction } from "@/lib/actions/availability";
import { Pencil } from "lucide-react";

export function EditRuleGroupDialog({
  orgSlug,
  orgId,
  membershipId,
  ruleIds,
  days,
  startTime,
  endTime,
  timezone,
}: {
  orgSlug: string;
  orgId: string;
  membershipId: string;
  ruleIds: string[];
  days: number[];
  startTime: string;
  endTime: string;
  timezone: string;
}) {
  const [open, setOpen] = useState(false);
  const action = saveAvailabilityRuleGroupAction.bind(null, orgSlug, orgId, membershipId, ruleIds);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <Pencil className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit availability</DialogTitle>
        </DialogHeader>
        <RuleGroupForm
          action={action}
          defaultTimezone={timezone}
          defaultDays={days}
          defaultStartTime={startTime}
          defaultEndTime={endTime}
          submitLabel="Save"
          onSaved={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
