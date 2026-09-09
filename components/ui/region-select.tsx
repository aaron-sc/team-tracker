"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REGIONS } from "@/lib/constants/regions";

/**
 * A `name="region"` form field backed by a fixed dropdown of common esports server regions, with
 * an "Other" option that reveals free text for anything not listed. Optional — unlike GameSelect,
 * leaving it unset is valid, so there's no required selection or hidden-field fallback needed.
 */
export function RegionSelect({ id = "region", defaultValue }: { id?: string; defaultValue?: string }) {
  const knownRegion = defaultValue && (REGIONS as readonly string[]).includes(defaultValue);
  const [region, setRegion] = useState(knownRegion ? defaultValue! : defaultValue ? "Other" : "");

  return (
    <div>
      <Select value={region} onValueChange={setRegion}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Choose a region (optional)" />
        </SelectTrigger>
        <SelectContent>
          {REGIONS.map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {region === "Other" ? (
        <Input name="region" placeholder="Name the region" defaultValue={knownRegion ? "" : defaultValue} className="mt-1.5" />
      ) : (
        <input type="hidden" name="region" value={region} />
      )}
    </div>
  );
}
