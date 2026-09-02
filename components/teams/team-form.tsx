"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/lib/actions/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";
import { GAMES } from "@/lib/constants/games";

export function TeamForm({
  action,
  defaultValues,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: { name?: string; game?: string };
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  const knownGame = defaultValues?.game && (GAMES as readonly string[]).includes(defaultValues.game);
  const [game, setGame] = useState(knownGame ? defaultValues!.game! : defaultValues?.game ? "Other" : "");

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Team name</Label>
        <Input id="name" name="name" placeholder="Nova Valorant" defaultValue={defaultValues?.name} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="game">Game</Label>
        <Select value={game} onValueChange={setGame}>
          <SelectTrigger id="game" className="w-full">
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
            defaultValue={knownGame ? "" : defaultValues?.game}
            required
            className="mt-1.5"
          />
        ) : (
          <input type="hidden" name="game" value={game} />
        )}
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton>Save team</SubmitButton>
    </form>
  );
}
