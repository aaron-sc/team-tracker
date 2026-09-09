"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ranksForGame } from "@/lib/constants/ranks";

/** Sentinel for "no rank set" — Radix Select can't use an empty string as an item value, and
 *  server-side code treats this the same as null/unset. */
export const UNRANKED = "UNRANKED";

/** A `name="rank"` field backed by the rank ladder for `game` (lib/constants/ranks.ts), so a
 *  team's average can be computed from consistent tiers instead of free text. */
export function RankSelect({ id = "rank", game, defaultValue }: { id?: string; game: string; defaultValue?: string }) {
  const tiers = ranksForGame(game);

  return (
    <Select name="rank" defaultValue={defaultValue || UNRANKED}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNRANKED}>Unranked</SelectItem>
        {tiers.map((tier) => (
          <SelectItem key={tier} value={tier}>
            {tier}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
