"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

/** Mobile-only — on a small screen the primary CTA in the hero scrolls out of view almost
 *  immediately, so this keeps it one thumb-reach away the whole time. Hidden at the sm breakpoint
 *  and up, where the hero CTA stays reachable enough on its own. */
export function StickyMobileCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:hidden">
      <Button className="w-full" asChild>
        <Link href="/signup">
          Create your organization
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
