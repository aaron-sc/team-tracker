"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function todayValue(type: "date" | "datetime-local") {
  const now = new Date();
  const datePart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  if (type === "date") return datePart;
  return `${datePart}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export const DateField = React.forwardRef<HTMLInputElement, React.ComponentProps<"input"> & { type: "date" | "datetime-local" }>(
  function DateField({ className, type, ...props }, forwardedRef) {
    const innerRef = React.useRef<HTMLInputElement>(null);

    return (
      <div className="flex items-center gap-1.5">
        <Input
          ref={(node) => {
            innerRef.current = node;
            if (typeof forwardedRef === "function") forwardedRef(node);
            else if (forwardedRef) forwardedRef.current = node;
          }}
          type={type}
          className={cn("flex-1", className)}
          {...props}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => {
            const input = innerRef.current;
            if (!input) return;
            input.value = todayValue(type);
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
          }}
        >
          Today
        </Button>
      </div>
    );
  },
);
