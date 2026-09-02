"use client";

import { useEffect } from "react";
import { markAnnouncementReadAction } from "@/lib/actions/announcement-reads";
import { Eye } from "lucide-react";

export function AnnouncementReadTracker({
  orgId,
  announcementId,
  readCount,
  audienceSize,
  showCount,
}: {
  orgId: string;
  announcementId: string;
  readCount: number;
  audienceSize: number;
  showCount: boolean;
}) {
  useEffect(() => {
    markAnnouncementReadAction(orgId, announcementId).catch(() => {});
    // Only needs to fire once per mount — this announcement being on screen is "seen".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcementId]);

  if (!showCount) return null;

  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground" title={`${readCount} of ${audienceSize} have seen this`}>
      <Eye className="size-3" />
      {readCount}/{audienceSize}
    </span>
  );
}
