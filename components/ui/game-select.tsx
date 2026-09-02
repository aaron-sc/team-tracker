"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GAMES } from "@/lib/constants/games";

/**
 * A `name="game"` form field backed by a fixed dropdown (keeps roster/prospect data consistent —
 * no "LoL" vs "League of Legends" typos), with an "Other" option that reveals free text for
 * anything not listed. Self-contained: drop it in a form and it submits like a plain input.
 */
export function GameSelect({ id = "game", defaultValue }: { id?: string; defaultValue?: string }) {
  const knownGame = defaultValue && (GAMES as readonly string[]).includes(defaultValue);
  const [game, setGame] = useState(knownGame ? defaultValue! : defaultValue ? "Other" : "");

  return (
    <div>
      <Select value={game} onValueChange={setGame}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Choose a game" />
        </SelectTrigger>
        <SelectContent>
          {GAMES.map((g) => (
            <SelectItem key={g} value={g}>
              {g}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {game === "Other" ? (
        <Input
          name="game"
          placeholder="Name the game"
          defaultValue={knownGame ? "" : defaultValue}
          required
          className="mt-1.5"
        />
      ) : (
        <input type="hidden" name="game" value={game} />
      )}
    </div>
  );
}
