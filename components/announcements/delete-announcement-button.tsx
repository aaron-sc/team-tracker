"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteAnnouncementAction } from "@/lib/actions/announcements";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export function DeleteAnnouncementButton({
  orgSlug,
  orgId,
  announcementId,
}: {
  orgSlug: string;
  orgId: string;
  announcementId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this announcement?")) return;
        startTransition(async () => {
          const result = await deleteAnnouncementAction(orgSlug, orgId, announcementId);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
