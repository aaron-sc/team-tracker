import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CalendarClock,
  Users,
  MapPinned,
  ShieldCheck,
  BellRing,
  UserPlus,
  Globe,
  ArrowRight,
  ShieldAlert,
  Gamepad2,
  Wallet,
  Lock,
  Check,
  X,
} from "lucide-react";
import { FORMATION_DOCS_URL, FORMATION_BOT_TERMS_URL, FORMATION_BOT_PRIVACY_URL } from "@/lib/links";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/orgs");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="size-6 text-primary" />
            Formation
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ---------- Hero ---------- */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div
              className="fx-aurora absolute -left-24 -top-32 size-[34rem] rounded-full bg-[oklch(0.62_0.16_262)] opacity-[0.14] blur-3xl dark:opacity-[0.22]"
              style={{ animationDuration: "22s" }}
            />
            <div
              className="fx-aurora absolute -right-24 top-10 size-[30rem] rounded-full bg-[oklch(0.75_0.13_190)] opacity-[0.12] blur-3xl dark:opacity-[0.2]"
              style={{ animationDuration: "26s", animationDelay: "-8s" }}
            />
          </div>

          <div className="mx-auto max-w-6xl px-6 pt-20 text-center sm:pt-28">
            <p className="fx-rise mb-4 text-sm font-medium tracking-wide text-muted-foreground">
              Built for competitive esports organizations
            </p>
            <h1 className="fx-rise text-balance text-4xl font-bold tracking-tight sm:text-6xl" style={{ animationDelay: "80ms" }}>
              Run your org. Not five apps that don&apos;t talk to each other.
            </h1>
            <p className="fx-rise mx-auto mt-5 max-w-2xl text-lg text-muted-foreground" style={{ animationDelay: "160ms" }}>
              Formation replaces the spreadsheet, the Discord pings nobody reads, and the group chat where
              availability goes to die — with one place your whole org actually uses.
            </p>
            <div className="fx-rise mt-8 flex justify-center gap-3" style={{ animationDelay: "240ms" }}>
              <Button size="lg" className="group" asChild>
                <Link href="/signup">
                  Create your organization
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href={FORMATION_DOCS_URL} target="_blank" rel="noreferrer">
                  See how it works
                </Link>
              </Button>
            </div>
          </div>

          <div className="fx-rise mx-auto mt-14 max-w-5xl px-6 pb-20" style={{ animationDelay: "340ms" }}>
            <ProductShot src="/marketing/preview-dashboard.png" alt="Formation dashboard showing upcoming matches, announcements, and team performance" priority />
          </div>
        </section>

        {/* ---------- Problem ---------- */}
        <section className="border-y bg-muted/30 py-20">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Sound familiar?</h2>
            <div className="mx-auto mt-10 grid gap-4 sm:grid-cols-3">
              <PainCard text="Practice time is buried three days deep in a group chat, and half the roster missed it." />
              <PainCard text="Your roster spreadsheet and your Discord roles haven't matched in weeks." />
              <PainCard text="Someone finds out about a schedule change after they've already missed it." />
            </div>
            <p className="mx-auto mt-10 max-w-xl text-center text-lg font-medium">
              None of that is a people problem. It&apos;s a tooling problem.
            </p>
          </div>
        </section>

        {/* ---------- Showcase ---------- */}
        <section className="mx-auto max-w-6xl px-6 py-24">
          <div className="space-y-24">
            <Showcase
              eyebrow="Scheduling"
              title="Never double-book a scrim again."
              description="Matches and practices for every team on one calendar, filterable per team, with results and opponent records tracked automatically. Anyone can subscribe to a personal feed in their own calendar app — it stays in sync on its own."
              src="/marketing/preview-schedule.png"
              alt="Formation schedule calendar showing matches and practices across two teams"
            />
            <Showcase
              eyebrow="Analytics"
              title="Know if you're actually improving."
              description="A real win rate, per-team performance, and attendance trends — computed automatically from the matches and sessions you're already logging. Not a gut feeling."
              src="/marketing/preview-analytics.png"
              alt="Formation analytics page showing org win rate and per-team performance bars"
              reverse
            />
            <Showcase
              eyebrow="Team pages"
              title="Your team's whole toolkit, one tab."
              description="Roster, pinned VOD reviews and strat docs, and quick polls for things like picking a scrim day — instead of scrolling back through a channel history to find the link someone posted two weeks ago."
              src="/marketing/preview-team.png"
              alt="Formation team page showing roster, pinned resources, and a poll"
            />
          </div>
        </section>

        {/* ---------- Adoption ---------- */}
        <section className="border-y bg-muted/30 py-20">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              &quot;Cool, but will my roster actually use it?&quot;
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              The honest failure mode of any team tool isn&apos;t missing features — it&apos;s players who never
              open it. Formation is built around not needing them to.
            </p>
            <div className="mx-auto mt-10 grid gap-6 text-left sm:grid-cols-3">
              <AdoptionPoint
                icon={<BellRing className="size-5" />}
                title="It comes to them"
                description="Reminders go out over Discord and browser push automatically. Nobody has to remember to check an app."
              />
              <AdoptionPoint
                icon={<Gamepad2 className="size-5" />}
                title="No app-switching required"
                description="A Discord bot lets players set their availability with a slash command, without ever leaving their server."
              />
              <AdoptionPoint
                icon={<ShieldAlert className="size-5" />}
                title="Accountability, not nagging"
                description="Captains see attendance reliability and who hasn't set availability yet — visibility does the reminding."
              />
            </div>
          </div>
        </section>

        {/* ---------- Comparison ---------- */}
        <section className="mx-auto max-w-4xl px-6 py-24">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            What you&apos;re replacing
          </h2>
          <div className="mt-10 overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="p-4 text-left font-medium text-muted-foreground">&nbsp;</th>
                  <th className="p-4 text-left font-medium text-muted-foreground">Spreadsheet + Discord + group chat</th>
                  <th className="p-4 text-left font-medium">Formation</th>
                </tr>
              </thead>
              <tbody>
                <ComparisonRow label="One roster, always current" />
                <ComparisonRow label="Reminders players actually see" />
                <ComparisonRow label="Timezone-aware availability" />
                <ComparisonRow label="Real win rate & attendance trends" />
                <ComparisonRow label="Who can edit what, precisely" />
                <ComparisonRow label="Your data, self-hosted" />
              </tbody>
            </table>
          </div>
        </section>

        {/* ---------- Feature grid ---------- */}
        <section className="border-t bg-muted/30 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">And everything else</h2>
              <p className="mt-3 text-muted-foreground">Every card below is a real, shipped feature — not a roadmap promise.</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <FeatureCard
                icon={<Users className="size-5" />}
                title="Custom roles"
                description="Coaches, managers, captains, players, analysts — or define your own roles with granular permissions."
              />
              <FeatureCard
                icon={<UserPlus className="size-5" />}
                title="Recruitment pipeline"
                description="Scout high school, college, and pro prospects through a full pipeline with notes and history."
              />
              <FeatureCard
                icon={<Globe className="size-5" />}
                title="Public roster embeds"
                description="Drop a live, customizable roster widget into your org's own website — no manual updates."
              />
              <FeatureCard
                icon={<MapPinned className="size-5" />}
                title="Venue directory"
                description="Track LAN venue addresses, capacity, and contacts for in-person events."
              />
              <FeatureCard
                icon={<ShieldAlert className="size-5" />}
                title="Player conduct"
                description="Bench and disciplinary records, visible only to coaches, managers, and owners."
              />
              <FeatureCard
                icon={<Gamepad2 className="size-5" />}
                title="Game stats sync"
                description="Pull a League of Legends rank or Steam profile straight onto a player's roster card."
              />
              <FeatureCard
                icon={<Wallet className="size-5" />}
                title="Gear & expenses"
                description="Track org-owned equipment and a lightweight expense ledger, without a spreadsheet on the side."
              />
              <FeatureCard
                icon={<CalendarClock className="size-5" />}
                title="Suggested times"
                description="Scheduling a match or practice surfaces the times your roster is actually most available."
              />
            </div>
          </div>
        </section>

        {/* ---------- Self-hosted ---------- */}
        <section className="mx-auto max-w-4xl px-6 py-24 text-center">
          <Lock className="mx-auto mb-4 size-8 text-primary" />
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Self-hosted. Your data stays yours.</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Formation runs on infrastructure you control — not a third-party SaaS platform holding your roster
            hostage. No one else&apos;s outage takes down your org&apos;s schedule.
          </p>
        </section>

        {/* ---------- Final CTA ---------- */}
        <section className="border-t bg-muted/30 py-20">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ready to run your org like a pro?</h2>
            <p className="mt-3 text-muted-foreground">Set up your organization in under a minute — no credit card, no sales call.</p>
            <div className="mt-8 flex justify-center gap-3">
              <Button size="lg" className="group" asChild>
                <Link href="/signup">
                  Create your organization
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">I have an account</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <p>Formation — built for competitive esports organizations.</p>
          <div className="flex items-center gap-4">
            <a href={FORMATION_DOCS_URL} target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">
              Docs
            </a>
            <a href={FORMATION_BOT_TERMS_URL} target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">
              Bot terms
            </a>
            <a href={FORMATION_BOT_PRIVACY_URL} target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">
              Bot privacy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProductShot({ src, alt, priority }: { src: string; alt: string; priority?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-2xl shadow-primary/10">
      <div className="flex items-center gap-1.5 border-b bg-muted/50 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-destructive/40" />
        <span className="size-2.5 rounded-full bg-amber-500/40" />
        <span className="size-2.5 rounded-full bg-emerald-500/40" />
      </div>
      <Image src={src} alt={alt} width={1440} height={960} priority={priority} className="w-full" />
    </div>
  );
}

function Showcase({
  eyebrow,
  title,
  description,
  src,
  alt,
  reverse,
}: {
  eyebrow: string;
  title: string;
  description: string;
  src: string;
  alt: string;
  reverse?: boolean;
}) {
  return (
    <div className={`grid items-center gap-10 lg:grid-cols-2 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
      <div>
        <p className="text-sm font-semibold tracking-wide text-primary">{eyebrow}</p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h3>
        <p className="mt-4 text-muted-foreground">{description}</p>
      </div>
      <ProductShot src={src} alt={alt} />
    </div>
  );
}

function PainCard({ text }: { text: string }) {
  return (
    <Card className="border-destructive/20 bg-destructive/5">
      <CardContent className="pt-6 text-sm">{text}</CardContent>
    </Card>
  );
}

function AdoptionPoint({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div>
      <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ComparisonRow({ label }: { label: string }) {
  return (
    <tr className="border-b last:border-0">
      <td className="p-4 font-medium">{label}</td>
      <td className="p-4">
        <X className="size-4 text-muted-foreground/50" />
      </td>
      <td className="p-4">
        <Check className="size-4 text-primary" />
      </td>
    </tr>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="group transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
      <CardContent className="pt-6">
        <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          {icon}
        </div>
        <h3 className="font-medium">{title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
