# Formation

Team management for esports organizations — rosters with custom roles, match and practice
scheduling, player availability, venue logistics, and a multi-level recruitment pipeline.

## Stack

Next.js (App Router) + TypeScript · Prisma + SQLite (dev) · NextAuth v5 (Credentials/JWT) ·
Tailwind + shadcn/ui · Zod · date-fns

## Getting started

```bash
npm install
cp .env.example .env   # then set AUTH_SECRET (openssl rand -base64 32)
npx prisma migrate dev
npx prisma db seed
npm run dev
```

The app runs at **http://localhost:3300**.

### Seeded demo accounts

The seed script creates one organization ("Nova Esports") with two teams, a full roster,
scheduled matches/practices, availability data, and a recruitment pipeline. All seeded
accounts share the password `password123`:

| Role    | Email                            |
| ------- | --------------------------------- |
| Owner   | aaron.santacruz03@gmail.com       |
| Manager | riley.manager@example.com         |
| Coach   | marcus.coach@example.com          |
| Player  | ava.player@example.com            |

## Features

- **Custom roles & permissions** — org-defined roles (Owner/Coach/Manager/Captain/Player/Analyst
  seeded by default) with a granular permission checklist, enforced both server-side
  (`lib/auth/authorize.ts`) and in the UI.
- **Roster & teams** — a shared org-wide member pool; each person can sit on zero, one, or
  multiple team rosters (e.g. a flex player or a manager overseeing multiple squads).
- **Scheduling** — matches (opponent, format, stream platform/URL/caster, online or LAN with a
  venue, results) and practice/scrim sessions with per-player attendance, on a unified
  month/week calendar.
- **Availability & conflicts** — players set recurring weekly availability plus one-off
  exceptions; practice sessions flag anyone whose stated availability conflicts with the
  scheduled time.
- **Venue directory** — address, capacity, and contact details for LAN venues.
- **Recruitment pipeline** — a kanban board (Scouting → Contacted → Tryout → Offer →
  Signed/Passed) across High School, College, and Pro prospects, with a full stage-change
  history per prospect.
- **Announcements & audit log** — org- or team-scoped announcements, and an audit trail of
  sensitive actions (role/permission changes, invites, member removal).
- **Invite-link onboarding** — no email service wired up yet; admins generate a shareable
  invite link per email + role from Settings → Members.

## Project structure

```
app/[orgSlug]/...        org-scoped pages (dashboard, roster, teams, schedule, availability,
                          venues, recruitment, announcements, settings)
app/(auth)/...            login, signup, invite-accept
lib/actions/               Server Actions, grouped by domain
lib/auth/                  NextAuth config, session→membership loading, permission checks
lib/availability/          timezone helpers + conflict-detection algorithm
lib/permissions.ts         Permission enum groups, labels, and role presets
prisma/schema.prisma       full data model
prisma/seed.ts             demo data
```

## Notes

- Dev database is SQLite (`prisma/dev.db`); the schema avoids SQLite-only quirks so a move to
  Postgres later is a config change, not a rewrite.
- `npx prisma studio` to browse the database directly.
