import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { GuideNav, GuideNavMobile } from "@/components/marketing/guide-nav";

export const metadata: Metadata = {
  title: "User Guide",
  description: "How to set up your organization and use every part of Formation — roster, scheduling, scrims, and more.",
  alternates: { canonical: "/guide" },
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-6">
      <h2 className="mb-3 text-xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-muted-foreground [&_strong]:text-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:text-foreground">
        {children}
      </div>
    </section>
  );
}

export default function GuidePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="size-6 text-primary" />
            Formation
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <Breadcrumbs items={[{ label: "User Guide" }]} />

        {/* No lg:items-start here on purpose — a sticky element's stuck range is bounded by its own
            grid cell's height, and items-start would size that cell to the (short) nav instead of
            stretching it to match the much taller content column, so the sidebar would stop
            sticking a few sections in. Default stretch gives the cell the full height it needs;
            lg:self-start on the aside keeps the element itself from stretching along with it. */}
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
          <aside className="sticky top-8 hidden max-h-[calc(100vh-4rem)] overflow-y-auto pb-8 lg:block lg:self-start">
            <GuideNav />
          </aside>

          <div className="min-w-0 max-w-2xl">
            <h1 className="mb-1 text-3xl font-bold tracking-tight">User Guide</h1>
            <p className="mb-6 text-muted-foreground">
              Everything your organization needs to run day-to-day in Formation, grouped the same way as the
              sidebar. Search this page with <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">Ctrl/⌘ F</kbd>{" "}
              or jump straight to a topic.
            </p>
            <div className="mb-8">
              <GuideNavMobile />
            </div>

            <Section id="welcome" title="Welcome">
              <p>
                Formation is invite-only: someone already running an org sends you a link, or you{" "}
                <Link href="/signup" className="text-primary underline underline-offset-4">
                  request access
                </Link>{" "}
                to start a new one. Accepting an invite email adds you as a member of that organization; once
                you&apos;re signed in, the org switcher in the header (or{" "}
                <Link href="/orgs" className="text-primary underline underline-offset-4">
                  All organizations
                </Link>
                ) moves you between every org you belong to.
              </p>
              <p>
                New members land on a short onboarding checklist before the rest of the app unlocks — see{" "}
                <a href="#onboarding" className="text-primary underline underline-offset-4">
                  Onboarding
                </a>{" "}
                below.
              </p>
            </Section>

            <Section id="roles-permissions" title="Roles & permissions">
              <p>
                Roles are fully custom per organization — there&apos;s no fixed &quot;admin/member&quot; split.
                Whoever creates the org gets a built-in <strong>Owner</strong> role with every permission; from
                there, <strong>Settings → Roles</strong> lets you create additional roles, pick a name and color,
                and check off exactly which permissions each one grants (managing the roster, publishing
                announcements, viewing analytics, and so on).
              </p>
              <p>A member can hold more than one role, and what they see in the sidebar is just whichever pages their combined permissions unlock.</p>
            </Section>

            <Section id="roster" title="Roster">
              <p>
                The org-wide list of every member, independent of which team(s) they&apos;re on. Each player has a
                profile page with their in-game name, position, self-reported rank, bio, tracker links, and a
                history of bench/disciplinary notes for coaches to reference.
              </p>
              <p>Add someone to the roster by inviting them (see <a href="#members" className="text-primary underline underline-offset-4">Members &amp; invites</a>) — a roster entry is created automatically once they accept.</p>
            </Section>

            <Section id="teams" title="Teams & ranks">
              <p>
                A team is a game-specific squad pulled from the roster — you&apos;ll typically have one per title
                you compete in (a Valorant team, a League team, etc.). Add roster members to a team&apos;s lineup
                from the team page.
              </p>
              <p>
                Every player can self-report a rank tier for their game (e.g. &quot;Diamond 2&quot;). A team&apos;s
                page automatically averages its lineup&apos;s ranks into one number — no manual math — which is
                also what gets shown to other orgs when you post a Scrim Finder listing.
              </p>
            </Section>

            <Section id="schedule" title="Schedule">
              <p>
                One calendar for both <strong>matches</strong> (official games) and <strong>practice
                sessions</strong> (scrims, VOD review, whatever your team calls its blocked practice time), filterable
                by team. Creating either one notifies the players involved and, if a venue is attached, checks it
                against everything else already booked there — a banner warns you before you double-book a LAN
                house or server slot, though it won&apos;t stop you from doing it anyway if that&apos;s intentional.
              </p>
              <p>Every player can subscribe to their own teams&apos; schedule as a live calendar feed (Google Calendar, Apple Calendar, Outlook) from the &quot;Subscribe&quot; button on this page.</p>
            </Section>

            <Section id="availability" title="Availability">
              <p>
                Each player sets a recurring weekly availability pattern plus one-off exceptions (an exam week, a
                vacation) from <strong>My availability</strong>. Coaches use this when picking match/practice
                times so a scheduling conflict is visible before it&apos;s sent, not after someone declines.
              </p>
            </Section>

            <Section id="venues" title="Venues">
              <p>
                The list of physical or virtual locations your org schedules against — a gaming house, a LAN
                venue, a dedicated server/lobby. Attaching a venue to a match or practice is what powers the
                double-booking warning on the Schedule page.
              </p>
            </Section>

            <Section id="scrims" title="Scrim Finder">
              <p>
                A matchmaking board for scheduling scrims against other Formation orgs. Post a listing for one of
                your teams (game, region, proposed time) and it&apos;s visible to every other org looking for the
                same game and region; or browse <strong>Open scrim listings</strong> and request one yourself.
              </p>
              <p>
                Only teams that play a listing&apos;s game can request it, and your team&apos;s average rank (see{" "}
                <a href="#teams" className="text-primary underline underline-offset-4">Teams &amp; ranks</a>) travels
                with the request automatically. Once a request is accepted, it&apos;s added to <strong>both</strong>{" "}
                orgs&apos; schedules as a practice session — no separate step needed. Track everything you&apos;ve
                posted or requested, at any status, from the &quot;Your listings&quot; and &quot;Requests sent&quot;
                tabs.
              </p>
            </Section>

            <Section id="strategies" title="Strategies">
              <p>
                A shared playbook per team — write up executes, defaults, and set pieces as strategy entries your
                whole roster can reference before a scrim or match. Duplicate an existing strategy as a starting
                point for a variant instead of writing one from scratch.
              </p>
            </Section>

            <Section id="recruitment" title="Recruitment">
              <p>
                A tryout pipeline for tracking prospective players through <strong>Scouting → Contacted →
                Tryout → Offer</strong>, ending in <strong>Signed</strong> or <strong>Passed</strong>. Moving a
                prospect&apos;s stage is logged and, if enabled, notifies whoever&apos;s watching the pipeline.
              </p>
            </Section>

            <Section id="analytics" title="Analytics">
              <p>
                Team-level performance at a glance: win rate from decided matches, and attendance broken down by
                team across practices and scrims. Numbers fill in as results get recorded and attendance gets
                marked — an empty chart just means there&apos;s no history yet, not a bug.
              </p>
            </Section>

            <Section id="announcements" title="Announcements">
              <p>
                Org-wide posts — roster news, schedule changes, anything everyone should see. Publishing one
                notifies every member and, if your org (or a specific team) has a Discord webhook configured (see{" "}
                <a href="#integrations" className="text-primary underline underline-offset-4">Discord &amp; calendar</a>),
                posts it there too. You can schedule an announcement for later, edit a published one, or duplicate
                an old one as a starting point for a new post.
              </p>
            </Section>

            <Section id="messages" title="Messages">
              <p>
                Direct, one-to-one messages between two members of the same org — for the kind of quick
                conversation that doesn&apos;t belong in an org-wide announcement or Discord. Start one from the
                Messages page or a player&apos;s roster profile.
              </p>
            </Section>

            <Section id="notifications" title="Notifications">
              <p>
                The bell icon in the header collects everything that happens to you — a new match, an accepted
                scrim, a message, an announcement — and links straight to it. Not every alert is useful to every
                person: mute individual notification types (per player, not org-wide) from{" "}
                <strong>Account → Notification preferences</strong>.
              </p>
            </Section>

            <Section id="onboarding" title="Onboarding">
              <p>
                A checklist new members complete before the rest of the org unlocks for them — things like
                filling out their profile or reviewing team rules. Org admins define what&apos;s on that checklist
                from <strong>Settings → Onboarding tasks</strong>; everyone&apos;s progress against it is visible
                from the Onboarding page.
              </p>
            </Section>

            <Section id="gear" title="Gear">
              <p>
                An inventory of equipment your org owns — peripherals, jerseys, hardware — each with a status
                (<strong>Available, Assigned, Maintenance, Lost, Retired</strong>) and, when handed out, the
                player or team it&apos;s assigned to. Export the full inventory as a CSV from the page toolbar.
              </p>
            </Section>

            <Section id="expenses" title="Expenses">
              <p>
                A running ledger of org spend — categorized, optionally attributed to a specific team, with who
                logged it and when. Export it as a CSV the same way as Gear, for whoever handles the org&apos;s
                books outside Formation.
              </p>
            </Section>

            <Section id="search" title="Search">
              <p>
                Press <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">Ctrl/⌘ K</kbd> anywhere
                in the app to open search — it covers players, teams, matches, practice sessions, scrim
                listings, and announcements across your current org, all from one box.
              </p>
            </Section>

            <Section id="shortcuts" title="Keyboard shortcuts">
              <p>
                Press <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">?</kbd> anywhere to
                pop open the full shortcuts panel. The short version: <code>Ctrl/⌘ K</code> for search, and a
                &quot;go to&quot; chord — tap <code>G</code>, then a letter — for one-key navigation:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li><code>G</code> then <code>D</code> — Dashboard</li>
                <li><code>G</code> then <code>R</code> — Roster</li>
                <li><code>G</code> then <code>T</code> — Teams</li>
                <li><code>G</code> then <code>S</code> — Schedule</li>
              </ul>
              <p>
                Both are disabled while you&apos;re typing in a text field, so they never interfere with actually
                writing something. The user menu also has <strong>Take a tour</strong> (a guided walkthrough of the
                app shell) and <strong>What&apos;s new</strong> (the release changelog) if you&apos;d rather explore that way.
              </p>
            </Section>

            <Section id="org-profile" title="Organization profile">
              <p>
                <strong>Settings → Organization</strong> holds the org&apos;s name, logo, timezone (the default for
                everything scheduling-related), website, and brand color, plus a one-click JSON export of your
                whole org&apos;s data and, if you have the permission, a &quot;reset&quot; to wipe the roster,
                schedule, and pipeline clean for a new season — export a backup first if you want to keep one.
              </p>
            </Section>

            <Section id="roles" title="Roles">
              <p>
                Covered above in <a href="#roles-permissions" className="text-primary underline underline-offset-4">Roles &amp; permissions</a> — manage the actual role list, colors, and permission checkboxes from <strong>Settings → Roles</strong>.
              </p>
            </Section>

            <Section id="members" title="Members & invites">
              <p>
                Invite people from <strong>Settings → Members</strong> — paste a single email or a whole batch
                (one per line or comma-separated) to invite several people at once in the same role. From the
                same page you can change anyone&apos;s role, remove a member, or revoke a pending invite before
                it&apos;s accepted.
              </p>
            </Section>

            <Section id="audit-log" title="Audit log">
              <p>
                A record of sensitive actions — role changes, member removals, permission edits, data resets —
                with who did what and when. Useful for a quick &quot;wait, who changed that&quot; a few weeks
                later. Visible from <strong>Settings → Audit Log</strong> to anyone with permission to view it.
              </p>
            </Section>

            <Section id="integrations" title="Discord & calendar">
              <p>
                <strong>Discord webhook</strong>: set one org-wide from <strong>Settings → Integrations</strong> to
                post announcements and match results into a channel; any team can override it with its own
                webhook from that team&apos;s edit page for a dedicated channel and match/practice/scrim reminders.
              </p>
              <p>
                <strong>Discord bot</strong>: beyond webhook pings, connecting the bot to your server lets players
                run <code>/available</code> right from Discord to add a weekly availability rule without opening
                Formation at all.
              </p>
              <p>
                <strong>Calendar sync</strong>: every player can subscribe to their own teams&apos; schedule as a
                live feed from the &quot;Subscribe&quot; button on the Schedule page — no setup needed here. An
                org-wide feed covering every team at once is also available there, gated by the API key below.
              </p>
            </Section>

            <Section id="api-access" title="API access">
              <p>
                Generate a read-only API key from <strong>Settings → Integrations</strong> to let another tool —
                like Atlas — read this org&apos;s teams and rosters (in-game names included) instead of keeping a
                separate, second copy of that data. Send it as a bearer token on every request:
              </p>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs text-foreground">
{`Authorization: Bearer <api key>`}
              </pre>
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-foreground">GET /api/v1/organization</p>
                  <p>Basic org info — id, name, slug, timezone.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">GET /api/v1/teams</p>
                  <p>Every team — id, name, game, slug, roster size.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">GET /api/v1/teams/:teamId/roster</p>
                  <p>A team&apos;s roster, including each player&apos;s in-game name.</p>
                </div>
              </div>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs text-foreground">
{`curl -H "Authorization: Bearer <api key>" \\
  https://your-formation-app.example/api/v1/teams`}
              </pre>
            </Section>

            <div className="rounded-lg border bg-muted/40 p-5 text-sm">
              <p className="font-medium">Still stuck?</p>
              <p className="mt-1 text-muted-foreground">
                <Link href="/contact" className="text-primary underline underline-offset-4">
                  Get in touch
                </Link>{" "}
                and we&apos;ll help you sort it out.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Formation — built for competitive esports organizations.
      </footer>
    </div>
  );
}
