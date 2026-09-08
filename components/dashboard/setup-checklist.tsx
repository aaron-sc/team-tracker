"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";

export type SetupStep = {
  key: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
  icon: React.ReactNode;
};

/** A dismissible getting-started checklist for brand-new orgs — distinct from the player-facing
 *  "Onboarding" nav item (HR tasks/e-signatures). Disappears on its own once every step is done;
 *  the dismiss button is there for orgs that deliberately won't use one of the steps (e.g. no
 *  Discord). Dismissal is per-org since one person can belong to several. */
export function SetupChecklist({ orgId, steps }: { orgId: string; steps: SetupStep[] }) {
  const dismissKey = `formation-setup-dismissed-${orgId}`;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (localStorage.getItem(dismissKey) === "1") setDismissed(true);
      } catch {
        // Storage blocked — just leave the checklist showing.
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [dismissKey]);

  const doneCount = steps.filter((s) => s.done).length;
  if (dismissed || doneCount === steps.length) return null;

  function dismiss() {
    try {
      localStorage.setItem(dismissKey, "1");
    } catch {
      // Storage blocked — dismiss for this render only.
    }
    setDismissed(true);
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          Finish setting up ({doneCount}/{steps.length})
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={dismiss}>
          Dismiss
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step) => (
          <Link
            key={step.key}
            href={step.href}
            className="flex items-center justify-between gap-3 rounded-md border bg-background p-3 text-sm transition-colors hover:bg-accent"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                  step.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {step.done ? <Check className="size-4" /> : step.icon}
              </div>
              <div>
                <p className={step.done ? "font-medium text-muted-foreground line-through" : "font-medium"}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
            {!step.done ? <ArrowRight className="size-4 shrink-0 text-muted-foreground" /> : null}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
