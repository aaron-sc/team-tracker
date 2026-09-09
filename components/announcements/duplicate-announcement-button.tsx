"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { duplicateAnnouncementAction } from "@/lib/actions/announcements";
import { toast } from "sonner";
import { CopyPlus } from "lucide-react";

export function DuplicateAnnouncementButton({
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
        startTransition(async () => {
          const result = await duplicateAnnouncementAction(orgSlug, orgId, announcementId);
          if (result?.error) toast.error(result.error);
          else if (result?.success) toast.success(result.success);
        });
      }}
    >
      <CopyPlus className="size-3.5" />
    </Button>
  );
}
