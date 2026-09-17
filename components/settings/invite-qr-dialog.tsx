"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Loader2 } from "lucide-react";

/** Renders a scannable QR code for a single-use invite link, generated client-side (same as
 *  CopyInviteLinkButton, the origin is only known in the browser) so scanning it on a phone opens
 *  the exact link an admin would otherwise copy/paste. */
export function InviteQrDialog({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const url = `${window.location.origin}/invite/${token}`;
    QRCode.toDataURL(url, { width: 320, margin: 1 }).then((generated) => {
      if (!cancelled) setDataUrl(generated);
    });
    return () => {
      cancelled = true;
    };
  }, [open, token]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <QrCode className="size-4" />
          QR code
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Scan to accept invite</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center py-2">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- a generated data: URI, not an optimizable remote image
            <img src={dataUrl} alt="Invite QR code" className="size-64 rounded-md border" />
          ) : (
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Scanning this opens the same one-time invite link on their phone.
        </p>
      </DialogContent>
    </Dialog>
  );
}
