"use client";

import { useTransition } from "react";
import { setIgnoreAvailabilityAction } from "@/lib/actions/availability";
import { Button } from "@/components/ui/button";
import { EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";

/** Shown next to a player on the team availability page — lets a manager/coach exclude someone
 *  from suggested-times entirely (see Membership.ignoreAvailability's doc comment), for someone
 *  inactive or who never fills in availability, without touching their actual availability rules. */
export function IgnoreAvailabilityToggle({
  orgSlug,
  orgId,
  membershipId,
  ignored,
}: {
  orgSlug: string;
  orgId: string;
  membershipId: string;
  ignored: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      title={ignored ? "Excluded from suggested times — click to include again" : "Ignore this person's availability"}
      onClick={() => {
        startTransition(async () => {
          const result = await setIgnoreAvailabilityAction(orgSlug, orgId, membershipId, !ignored);
          if (result?.error) toast.error(result.error);
          else toast.success(result?.success ?? "Updated.");
        });
      }}
    >
      {ignored ? (
        <>
          <EyeOff className="size-3.5" />
          Ignored
        </>
      ) : (
        <>
          <Eye className="size-3.5" />
          Ignore availability
        </>
      )}
    </Button>
  );
}
