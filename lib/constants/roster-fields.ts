// Roster-entry fields a team can let its own players self-edit (see Team.playerEditableFields
// and lib/actions/teams.ts's updateRosterEntryAction) — as opposed to bio/trackers, which every
// player can always edit on their own entry, and isStarter, which stays coach-only always.
export const SELF_EDITABLE_ROSTER_FIELDS = ["jerseyNumber", "position", "inGameName", "rank"] as const;

export type SelfEditableRosterField = (typeof SELF_EDITABLE_ROSTER_FIELDS)[number];

export const ROSTER_FIELD_LABELS: Record<SelfEditableRosterField, string> = {
  jerseyNumber: "Jersey number",
  position: "Position",
  inGameName: "In-game name",
  rank: "Rank",
};

// Applied to every team that hasn't customized this yet — matches what players could already
// self-edit (rank) plus the two fields this feature newly opens up (in-game name, jersey number).
// Position stays coach-only by default, same as the previous hardcoded behavior.
export const DEFAULT_PLAYER_EDITABLE_FIELDS: SelfEditableRosterField[] = ["jerseyNumber", "inGameName", "rank"];

function isSelfEditableField(value: unknown): value is SelfEditableRosterField {
  return (SELF_EDITABLE_ROSTER_FIELDS as readonly unknown[]).includes(value);
}

/** `Team.playerEditableFields` is a nullable JSON column — null means "never configured", which
 *  falls back to the default set rather than an empty one, so existing teams don't silently lose
 *  the self-edit ability players already had. */
export function getPlayerEditableFields(playerEditableFields: unknown): Set<SelfEditableRosterField> {
  if (!Array.isArray(playerEditableFields)) return new Set(DEFAULT_PLAYER_EDITABLE_FIELDS);
  return new Set(playerEditableFields.filter(isSelfEditableField));
}
