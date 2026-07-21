# Prompt for the Atlas AI

Paste everything below into a Claude Code session working in the **Atlas** (Valorant match
analytics) codebase.

---

I want to stop maintaining team/player data by hand in Atlas and instead pull it from
**Formation**, a separate esports team-management app I run alongside Atlas. Formation is the
source of truth for rosters now — it has org-defined teams and, for each roster slot, the
player's name, their **in-game name (IGN)**, position, and jersey number. Atlas should link to
one of those teams and use its roster (specifically the IGN) as the input for whatever Atlas
already does to pull per-player match/comp data — instead of me typing player names into Atlas
by hand.

Concretely:

1. **Investigate first.** Look at how Atlas currently collects the list of players/IGNs it
   tracks and turns that into match/comp data (Riot API calls, a database table, an admin form
   — whatever it is). I want to understand the existing shape before you change it, so summarize
   what you find before writing code.
2. **Add a Formation integration**: a settings screen where I paste in a Formation base URL and
   API key, stored server-side (env var or a settings table — match however Atlas already stores
   this kind of config). Call Formation's API from the server side only; never expose the API key
   to the browser.
3. **Add a "link team" flow**: call `GET /api/v1/teams` to list Formation's teams for that org,
   let me pick one, and store the link (Formation `teamId` + name/game) against whatever Atlas
   currently treats as its own "team" concept — reuse that concept rather than inventing a
   parallel one if Atlas already has it.
4. **Replace manual roster entry with the Formation roster** for a linked team: call
   `GET /api/v1/teams/:teamId/roster`, and for each player use `inGameName` as the input to
   Atlas's existing Riot lookup / match-pull logic (whatever you found in step 1). Players without
   an `inGameName` set in Formation should show clearly as "no IGN set — add one in Formation" rather
   than silently failing.
5. **Keep it read-only and pull-based for now**: Atlas reads from Formation on a schedule or on
   demand (e.g. a "sync roster" button, or whenever the linked team's page loads) — no need to
   push anything back to Formation. Don't build a webhook receiver unless you find Atlas already
   has infrastructure for that.
6. **Don't guess Formation's internals beyond the contract below.** Treat Formation purely as an
   external HTTP API with the shape documented here — nothing else about its codebase, schema, or
   permission model is relevant to Atlas.

## Formation API contract

Base URL: whatever I configure in the integration settings (e.g. `https://formation.example.com`
or `http://localhost:3300` for local dev — Formation's dev server runs on port 3300, not 3000,
specifically so it doesn't collide with Atlas).

Auth: every request needs

```
Authorization: Bearer <api key>
```

The key is generated per-organization from Formation's Settings → Integrations page. A 401 means
the key is missing/invalid/revoked — surface that clearly in the Atlas UI rather than failing
silently, since keys can be rotated on the Formation side at any time.

### `GET /api/v1/organization`

```json
{
  "organization": { "id": "clx...", "name": "Nova Esports", "slug": "nova-esports", "timezone": "America/Chicago" }
}
```

### `GET /api/v1/teams`

```json
{
  "teams": [
    { "id": "clx...", "name": "Nova Valorant", "game": "Valorant", "slug": "nova-valorant", "rosterSize": 6 }
  ]
}
```

`game` is free text (not an enum) — when presenting the team picker, you may want to filter to
teams where `game` looks like Valorant, but don't hard-fail on unexpected values since orgs can
name games however they want.

### `GET /api/v1/teams/:teamId/roster`

```json
{
  "team": { "id": "clx...", "name": "Nova Valorant", "game": "Valorant", "slug": "nova-valorant" },
  "roster": [
    {
      "membershipId": "clx...",
      "name": "Ava Nguyen",
      "inGameName": "avaplays#NA1",
      "position": "Duelist",
      "jerseyNumber": "2",
      "isStarter": true,
      "role": "Player"
    }
  ]
}
```

- `inGameName` is nullable — a player may not have set one yet.
- `membershipId` is Formation's stable identifier for that person in that org; store it alongside
  whatever Atlas uses as its own player ID so re-syncing updates the same record instead of
  creating duplicates when a name or IGN changes.
- 404 with `{ "error": "Team not found." }` if the `teamId` doesn't belong to the authenticated
  org (e.g. stale link after the team was deleted on the Formation side) — handle that by
  prompting me to re-link.

## What "done" looks like

- I can paste a Formation API key into Atlas once.
- I can pick one Formation team to link to an Atlas team.
- Atlas's existing per-player match/comp views are populated using IGNs pulled from Formation's
  roster, refreshed on demand, with no more manual "add a player" data entry for linked teams.
- Unlinked Atlas teams (if any) keep working exactly as before — this is additive, not a rewrite
  of everything Atlas does.
