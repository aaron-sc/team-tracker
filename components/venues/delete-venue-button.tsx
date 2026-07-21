"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteVenueAction } from "@/lib/actions/venues";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export function DeleteVenueButton({ orgSlug, orgId, venueId }: { orgSlug: string; orgId: string; venueId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this venue?")) return;
        startTransition(async () => {
          const result = await deleteVenueAction(orgSlug, orgId, venueId);
          if (result?.error) toast.error(result.error);
          else toast.success("Venue deleted.");
        });
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
