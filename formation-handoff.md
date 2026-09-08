# Formation — work handoff (2026-09-08)

Resume point for a desktop Claude Code session. Repo: `c:\Users\aaron\Documents\GitHub\team-tracker`, branch `main`, last commit `dec9918`. **All work below is uncommitted in the working tree.**

---

## Environment gotchas (read first)

1. **Run `npx prisma generate` before trusting a typecheck.** The generated client at `lib/generated/prisma/` is gitignored and goes stale; without regenerating you'll see hundreds of bogus "Property X does not exist on PrismaClient" errors.
2. **`next build` cannot run in this environment** — `discord.js`, `resend`, `web-push`, `driver.js` are in `package.json` but missing from `node_modules`. `npx tsc --noEmit` (after step 1) bottoms out at **14 pre-existing errors**, all "Cannot find module" / implicit-any for those 4 packages. That 14 is the clean baseline. `npx eslint <files>` works fine.
3. On a real desktop with a full `npm install`, do a `next build` + browser smoke test of everything below — none of it has been run, only typechecked + linted.

---

## DONE — Task 1: removed CSP + captchas

A previous turn added a nonce CSP + Cloudflare Turnstile; the user reverted it. All those files are back to their committed state. **The only survivor:** a one-line ESLint rule in `eslint.config.mjs` (`no-restricted-syntax` blocking `$queryRawUnsafe`/`$executeRawUnsafe`). It's inert (no raw SQL in the repo). Leave it unless the user asks to remove it.

Nothing more to do here.

---

## DONE (needs build + smoke test) — Task 2: invite-only signup via Discord approval

`/signup` is now a **request-access form**. New org accounts are created only after the operator approves via Discord.

### Flow
1. Visitor fills `/signup` form → `requestAccessAction` (`lib/actions/access-request.ts`) → row in new `AccessRequest` table (status `PENDING`, random `token`) → `notifyAccessRequest`.
2. `notifyAccessRequest` (`lib/access-requests/notify.ts`):
   - **Preferred:** bot posts to `ACCESS_REQUEST_DISCORD_CHANNEL_ID` with **Approve/Deny buttons** (`postAccessRequestForReview` in `lib/integrations/discord-bot.ts`).
   - **Fallback:** webhook (`ACCESS_REQUEST_DISCORD_WEBHOOK_URL`, then `FEEDBACK_DISCORD_WEBHOOK_URL`) with HMAC-signed approve/deny links. Same links are also added to the bot embed as a backup.
   - **Last resort:** logs the approve URL to server console.
3. Approve (button handler `handleAccessRequestButton` in `discord-bot.ts`, or `GET /api/access-requests/decide` route) → `approveAccessRequest` (`lib/access-requests/service.ts`): status→`APPROVED`, emails requester a single-use `/signup?token=…` link (`accessApprovedEmailHtml` in `lib/email/templates.ts`).
4. `/signup?token=…` (`app/(auth)/signup/page.tsx`) → if request is `APPROVED` && `!consumedAt`, renders `CompleteSignupForm` → `signupAction` (now **token-gated**, `lib/actions/auth.ts`). Email is taken from the AccessRequest, never form input. Marks `consumedAt` in the same transaction.
5. Decisions are idempotent (second click reports current state). HMAC keyed on `AUTH_SECRET` (`signDecision`/`verifyDecisionSig` in `service.ts`).

### Design decisions already locked (from user Q&A)
- Approval mechanism: **Discord Approve/Deny buttons** (chosen over in-app queue / manual allowlist).
- `/signup`: **replaced** (chosen over "gate the existing form").
- Fields collected: email, org name, IP, "why" + **name, role, website, Discord invite, game(s), roster size, referral source**.
- **Existing users/orgs keep access** — login, invites (`/invite/[token]`), team-join links (`/join/[token]`) do NOT go through the gate. Only new-org creation.

### New files
- `prisma/schema.prisma` — added `AccessRequestStatus` enum + `AccessRequest` model
- `prisma/migrations/20260908000000_access_requests/migration.sql` — **already applied to local `dev.db`** via `npx prisma migrate deploy`. Prod still needs it.
- `lib/validations/access-request.ts` — zod schema, `ACCESS_REQUEST_ROLES`, `ROSTER_SIZE_BUCKETS`
- `lib/access-requests/service.ts` — `approveAccessRequest`, `denyAccessRequest`, `signDecision`, `verifyDecisionSig`; return types `ApproveResult` / `DenyResult`
- `lib/access-requests/notify.ts` — `notifyAccessRequest` (bot → webhook → console fallback chain)
- `lib/actions/access-request.ts` — `requestAccessAction`, `RequestAccessState` type, honeypot + rate limit (`access_request`, 5/hr), silent on duplicate email
- `components/auth/request-access-form.tsx` — the public form
- `components/auth/complete-signup-form.tsx` — token-gated real signup form
- `app/api/access-requests/decide/route.ts` — signed GET approve/deny fallback link, returns a tiny HTML page

### Modified files
- `lib/actions/auth.ts` — `signupAction` now requires a valid `APPROVED` unconsumed token; email locked to the request; marks `consumedAt`. Also added `MAX_ORGS_PER_USER` + `countOwnedOrgs` (see Task 3).
- `lib/integrations/discord-bot.ts` — `import EmbedBuilder`, `FORMATION_EMBED_COLOR`, `approveAccessRequest`/`denyAccessRequest`, `getBackgroundBaseUrl`; wired `handleAccessRequestButton` into the `isButton()` branch before `handleRsvpButton`; added `handleAccessRequestButton` + exported `postAccessRequestForReview`. `custom_id` scheme: `accessreq:approve:<token>` / `accessreq:deny:<token>` (token is base64url, ~43 chars, no colons — safe).
- `lib/auth/auth.config.ts` — added `pathname.startsWith("/api/access-requests")` to the public-route list (route is authorized by HMAC sig, not session).
- `lib/email/templates.ts` — added `accessApprovedEmailHtml({ name, signupUrl })`
- `app/(auth)/signup/page.tsx` — full rewrite: token branch vs request-form branch
- `components/auth/signup-form.tsx` — **DELETED** (replaced by the two new forms)
- `app/page.tsx` — 3 CTA labels "Get started"/"Create your organization" → "Request access"; final-CTA subcopy changed to invite-only framing
- `app/(auth)/login/page.tsx` — footer "Create one" → "Request access"
- `lib/changelog.ts` — new `2026-09-08` entry at index 0
- `.env.example` — documented `ACCESS_REQUEST_DISCORD_CHANNEL_ID` + `ACCESS_REQUEST_DISCORD_WEBHOOK_URL`

### Manual steps the user must do to actually turn it on
- Set `ACCESS_REQUEST_DISCORD_CHANNEL_ID` in prod env (right-click channel → Copy Channel ID, needs Discord Developer Mode). Bot token (`DISCORD_BOT_TOKEN`) must already be set.
- Set `APP_URL` in prod so approval-email links are absolute (without it, the bot approve path skips the email and logs the link instead).
- Run `npx prisma migrate deploy` on prod.

### Known edge behaviors (intentional, mention if user asks)
- `AccessRequest.email` is `@unique`. A DENIED person can't re-request via the form (row already exists → silent "submitted"). To let them back in, delete the row.
- Duplicate submit while PENDING → silent success, no re-notify.
- If neither bot channel nor webhook configured → request sits PENDING, approve URL only in server logs.

### Verification status
- `npx tsc --noEmit`: clean (baseline 14 pre-existing module errors, none in new/changed files).
- `npx eslint` on all new/changed files: clean.
- NOT run: `next build`, the Discord bot path, any email send, the actual form submit. Do these on desktop.

---

## DONE (needs build + smoke test) — Task 3: 5-org-per-user cap

`lib/actions/auth.ts`:
- `export const MAX_ORGS_PER_USER = 5;`
- `countOwnedOrgs(userId)` = count of memberships where `role: { isSystem: true, name: "Owner" }`
- `createAdditionalOrgAction` returns `{ error: "You can own at most 5 organizations." }` when at/over the cap.
- "Owned" = you hold the system Owner role. Orgs you were invited to don't count. `signupAction` (first org, always count 0) is not gated.

---

## NOT STARTED — Task 4: roles overhaul (team-scoped roles + multi-role + escalation alerts)

User asked for this; I deferred it as its own change because it rewrites the permission layer (security boundary) and touches dozens of call sites. **Get explicit go-ahead before starting.** Full design:

### Current state
- `Role` belongs to an org, holds a flat `RolePermission[]` (Permission enum). Presets in `lib/permissions.ts` `ROLE_PRESETS` (Owner/Manager/Coach/Captain/Player/Analyst).
- `Membership` (user↔org) has exactly **one** `roleId`. All permissions org-wide.
- Checks: `lib/auth/authorize.ts`, `lib/org/require-permission-page.ts`, `lib/permissions.ts`, and independently `lib/integrations/discord-bot.ts` (`handleAvailable`, `handleBench`). API-key auth (`lib/api/auth.ts`, `/api/v1/*`) authenticates as the org, not a member.
- `TeamMembership` links people↔teams, carries `position`/`inGameName`, no permissions.
- No platform-admin role exists (that's why the access gate approves via Discord).

### Plan (in order)
1. **New join table `MembershipRole { membershipId, roleId, teamId? }`.** `teamId = null` → org-wide grant; `teamId` set → role's perms apply only to that team. Delivers BOTH multi-role (N rows/membership) and team scoping from one schema change. Migration backfills every existing `Membership.roleId` → one `teamId = null` row (preserves current behavior exactly). Keep `Membership.roleId` one release as fallback or drop with backfill.
2. **Single `can(membership, permission, { teamId? })` helper as the only permission entry point.** Effective perms = union of granted roles filtered by scope. Org-level perms (settings/members/billing) only accept org-wide grants; team actions accept org-wide OR matching team-scoped. **Migrate all call sites to `can()` first, then change its internals** — makes the scoping logic a near-one-file diff.
3. **Update the Discord bot in the same PR** — it enforces perms itself; skipping it = bypass. Decide whether scoping applies to API-key auth.
4. **Escalation notification** (cheap, only meaningful after 1–3): on assignment compute `addedPerms = union(current+new) − union(current)`; if non-empty, inline confirm ("This adds: strategy_manage, …") + audit entry (`lib/audit/log.ts`) + `createNotification` attributed to the granter.
5. **Invariants:** ≥1 org-wide Owner; Owner is org-wide-only (never team-scoped); multi-select assignment UI (`components/settings/member-role-select.tsx`, `roles/*` pages, `components/ui/role-badge.tsx`, audit log, bot `/whoami`) must handle a LIST of roles.

New team-scoped permissions follow the existing "add enum value + backfill migration to existing roles" pattern (see `20260904000000_strategy_and_discussion` migration's `strategy_manage` backfill).

Estimate ~1–2 weeks + security review of the permission checks. Do NOT combine with other work.

---

## SEO advice already given (no code written)

Prioritized recommendations delivered verbally; implement if user wants:
1. **Content depth** — the #1 lever. Add indexable pages: per-use-case (`/scheduling`, `/roster-management`, `/discord-availability-bot`), per-game landers, a `vs-spreadsheets` page (reuse the landing-page table), a `/guides` section with long-tail how-tos.
2. Public roster embed should carry a visible `rel` link back to Formation — every embedding org = backlink.
3. Technical: set `APP_URL` in prod (so `SITE_URL` isn't the hardcoded fallback in `lib/utils/site-url.ts`); per-page `alternates.canonical`; Organization JSON-LD with `sameAs`; compress landing PNGs + explicit `<Image sizes>`.
4. Set up Google Search Console, submit sitemap, wire `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
5. Off-page: esports directories, game subreddits, Discord communities.
6. Caveat: "Request access" converts worse than "Sign up free" — mild SEO/funnel headwind from the new gate.

---

## Suggested next actions on desktop
1. `npx prisma generate` then `npx tsc --noEmit` (expect 14 baseline errors) then `npm run build`.
2. Smoke test: `/signup` form submit → check Discord post → click Approve → check email → open `/signup?token=…` → create org. Also test the signed fallback link and the `/api/access-requests/decide` page.
3. Verify existing login + invite + team-join flows still work.
4. Commit Tasks 2 + 3 together (branch off `main` first).
5. Decide on Task 4 (roles) — get user go-ahead.
