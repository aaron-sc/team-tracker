# Formation

Team management for esports organizations — rosters with custom roles, match and practice
scheduling, player availability, venue logistics, direct messages, notifications, and a
multi-level recruitment pipeline. Built multi-tenant from the ground up: one login, many
organizations, each with its own branding, roles, and data.

## Stack

Next.js (App Router) + TypeScript · Prisma + SQLite (dev) · NextAuth v5 (Credentials/JWT) ·
Tailwind + shadcn/ui · Zod · date-fns · Resend (email)

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

### Email (invites, and later password resets)

Invite emails send through [Resend](https://resend.com). Without an API key configured,
invite creation still works — it just skips the email and you send the link manually with the
"Copy link" button, exactly like before.

To turn on real sending:

1. Sign up at resend.com (free tier, no credit card) and create an API key —
   [resend.com/api-keys](https://resend.com/api-keys).
2. Set `RESEND_API_KEY` in `.env`.
3. That's it — invites send from `onboarding@resend.dev` (Resend's shared test address, works
   for any recipient, no domain needed) until you set `EMAIL_FROM` to an address on a domain
   you've verified with Resend (see "Deploying to production" below for the domain-verification
   steps).

Password reset currently uses the same "copyable link, no email" pattern
(`lib/actions/auth.ts`) — swapping it to send via `lib/email/resend.ts` is a small follow-up
once you want it.

## Features

- **Multi-org accounts** — one login, many organizations. A user's `Membership` rows connect
  them to every org they belong to; `/orgs` is the picker, and the org switcher in the top nav
  jumps between them without logging out. Invite links (Settings → Members) add an existing or
  brand-new user to an org as a second (or first) membership.
- **Custom roles & permissions** — org-defined roles (Owner/Coach/Manager/Captain/Player/Analyst
  seeded by default) with a granular permission checklist, enforced both server-side
  (`lib/auth/authorize.ts`) and in the UI.
- **Org branding** — upload a logo (Settings → Organization) and pick an accent color; both
  apply across the sidebar, nav, and org picker.
- **Roster & teams** — a shared org-wide member pool; each person can sit on zero, one, or
  multiple team rosters (e.g. a flex player or a manager overseeing multiple squads). Export the
  roster to CSV from the Roster page.
- **Scheduling** — matches (opponent, format, stream platform/URL/caster, online or LAN with a
  venue, results) and practice/scrim sessions with per-player attendance, on a unified
  month/week calendar. Subscribe to the schedule as a calendar feed (`.ics`, via an org API key)
  from Google/Apple/Outlook calendar.
- **Availability & conflicts** — players set recurring weekly availability plus one-off
  exceptions; practice sessions flag anyone whose stated availability conflicts with the
  scheduled time.
- **Venue directory** — address, capacity, and contact details for LAN venues, or mark a venue
  **online** (no physical address — just a name and optional URL) for fully-remote setups.
- **Direct messages** — 1:1 messaging between org members (Messages in the sidebar), with
  near-real-time delivery via short-interval polling.
- **Notifications** — a bell in the top nav surfaces new messages, invite acceptances,
  recruitment stage changes, and admin-sent broadcasts (Announcements → Notify members, gated by
  the `notification_send_broadcast` permission).
- **Global search** — `Ctrl/Cmd+K` opens a command palette searching members, teams, venues, and
  recruitment prospects within the current org.
- **Discord webhook integration** — paste an incoming-webhook URL (Settings → Integrations) and
  Formation posts new announcements and match results to that Discord channel. No Discord app
  registration required.
- **Stats dashboard** — per-team win/loss record, practice attendance rate, and a recruitment
  funnel, all on the org dashboard.
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
                          venues, recruitment, announcements, messages, settings)
app/(auth)/...            login, signup, invite-accept
app/api/...                polling endpoints (messages, notifications, search) + calendar/CSV export
lib/actions/               Server Actions, grouped by domain
lib/auth/                  NextAuth config, session→membership loading, permission checks
lib/availability/          timezone helpers + conflict-detection algorithm
lib/integrations/          Discord webhook sender
lib/storage/                local-disk file upload (see "Deploying to production" below)
lib/permissions.ts         Permission enum groups, labels, and role presets
prisma/schema.prisma       full data model
prisma/seed.ts             demo data
```

## Notes

- Dev database is SQLite (`prisma/dev.db`); the schema avoids SQLite-only quirks so a move to
  Postgres later is a config change, not a rewrite.
- `npx prisma studio` to browse the database directly.
- Uploaded org logos are written to `public/uploads/` on local disk (gitignored). This works
  fine for local use and for a single-instance self-hosted deploy with a persistent disk — see
  below before deploying somewhere with an ephemeral or multi-instance filesystem.

## Deploying to production

This app currently runs entirely on your machine: SQLite on local disk, uploaded logos on local
disk, and a locally-generated `AUTH_SECRET`. To put it somewhere multiple people can reach, plan
for these changes:

1. **Database.** Swap SQLite for a hosted Postgres (Neon, Vercel Postgres, Supabase, or your own
   instance). In `prisma/schema.prisma` change the `datasource db` block's `provider` from
   `"sqlite"` to `"postgresql"`, point `DATABASE_URL` at the new database, then run
   `npx prisma migrate deploy` against it. SQLite-only quirks were deliberately avoided in the
   schema, so this is a config change, not a rewrite.
2. **File storage.** `lib/storage/local.ts` writes uploads to local disk — fine for a single
   long-running server with a persistent volume, but serverless hosts (Vercel, most PaaS) have
   an ephemeral or non-shared filesystem. Swap it for object storage (S3, Cloudflare R2, or
   Vercel Blob): same function signature (`saveUploadedImage(file, subdir) → public URL`), just
   change the implementation to upload to the bucket and return its public URL instead of
   writing to `public/`.
3. **Secrets.** Generate a fresh `AUTH_SECRET` for production (`openssl rand -base64 32`) — don't
   reuse the one from local dev. Set `AUTH_URL` (or `NEXTAUTH_URL`) to your public domain so
   NextAuth issues correct callback/redirect URLs.
4. **Discord webhooks / API keys** carry over as-is — they're just URLs and tokens stored on the
   `Organization` row, no code changes needed.
5. **Email domain.** Once you own a domain, add it in the Resend dashboard, add the SPF/DKIM DNS
   records it gives you at your registrar (or Cloudflare DNS), wait for verification, then set
   `EMAIL_FROM="Formation <invites@yourdomain.com>"`. Until then the shared `onboarding@resend.dev`
   sender keeps working — this step is optional, not blocking.
6. **Hosting.** Vercel is the path of least resistance for a Next.js app (pair with Neon Postgres
   + Vercel Blob). For self-hosting a single VM, use the Docker setup below — it keeps SQLite and
   local-disk uploads (steps 1–2 don't apply), since a single instance doesn't hit SQLite's
   concurrent-writer limitation.

### Self-hosting with Docker

The repo includes a `Dockerfile`, `docker-compose.yml`, and `Caddyfile` — this runs the app plus
a Caddy reverse proxy that gets you HTTPS automatically (via Let's Encrypt) for free, no manual
certificate handling.

On a fresh Ubuntu/Debian VM:

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# 2. Get the code onto the VM
git clone <your-repo-url> formation
cd formation

# 3. Configure
cp .env.example .env
nano .env   # set AUTH_SECRET, RESEND_API_KEY, EMAIL_FROM, AUTH_URL, APP_URL
echo "DOMAIN=yourdomain.com" >> .env

# 4. Point DNS
# Add an A record: yourdomain.com -> this VM's public IP (at your registrar/Cloudflare DNS)

# 5. Build and run
docker compose up -d --build

# 6. Watch it come up (first run applies migrations, then starts the app)
docker compose logs -f
```

The app is now live at `https://yourdomain.com` — Caddy requests and renews the TLS certificate
automatically once DNS resolves to the VM.

**Seeding demo data** (optional, skip for a real deployment):
`docker compose exec app npx prisma db seed`

**Redeploying after a code change:**
```bash
git pull
docker compose up -d --build
```
This rebuilds the image and re-runs migrations (via `docker-entrypoint.sh`) before restarting —
safe to run repeatedly, migrations that already applied are skipped.

**Data persistence:** the SQLite database and `public/uploads/` live on named Docker volumes
(`app-data`, `uploads`), so they survive `docker compose down` / rebuilds. Only
`docker compose down -v` (which deletes volumes) would wipe them — back up
`docker run --rm -v formation_app-data:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz -C /data .`
before doing anything destructive.
