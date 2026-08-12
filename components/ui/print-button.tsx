"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <Button size="sm" variant="outline" className="no-print" onClick={() => window.print()}>
      <Printer className="size-4" />
      {label}
    </Button>
  );
}
