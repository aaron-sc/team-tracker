import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CalendarClock,
  Radio,
  Users,
  MapPinned,
  ClipboardList,
  ShieldCheck,
  BellRing,
  UserPlus,
  Globe,
  ArrowRight,
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
        <section className="relative overflow-hidden">
          {/* Ambient drift — purely decorative, disabled under prefers-reduced-motion (see globals.css). */}
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

          <div className="mx-auto max-w-6xl px-6 py-20 text-center sm:py-28">
            <p className="fx-rise mb-4 text-sm font-medium tracking-wide text-muted-foreground">
              Built for competitive esports organizations
            </p>
            <h1
              className="fx-rise text-4xl font-bold tracking-tight sm:text-6xl"
              style={{ animationDelay: "80ms" }}
            >
              Run your esports org
              <br className="hidden sm:block" /> like a pro.
            </h1>
            <p
              className="fx-rise mx-auto mt-5 max-w-2xl text-lg text-muted-foreground"
              style={{ animationDelay: "160ms" }}
            >
              Rosters, custom roles, match &amp; practice scheduling, timezone-aware availability,
              venue logistics, and recruitment pipelines — all in one place, and reaching players
              through the tools they already have open.
            </p>
            <div
              className="fx-rise mt-8 flex justify-center gap-3"
              style={{ animationDelay: "240ms" }}
            >
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

        <section className="border-y bg-muted/30">
          <div className="mx-auto grid max-w-5xl gap-8 px-6 py-12 sm:grid-cols-3">
            <Step n={1} title="Create your org" description="Set your timezone, brand color, and logo — takes under a minute." />
            <Step n={2} title="Invite your roster" description="Coaches, managers, and players join with roles that match how your org actually runs." />
            <Step
              n={3}
              title="Schedule, track, connect"
              description="Matches, practices, and availability sync out to Discord and push notifications automatically."
            />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Everything an org needs to run itself</h2>
            <p className="mt-3 text-muted-foreground">
              No spreadsheets, no scattered group chats — one place your whole org actually uses.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Users className="size-5" />}
              title="Custom roles"
              description="Coaches, managers, captains, players, analysts — or define your own roles with granular permissions."
            />
            <FeatureCard
              icon={<CalendarClock className="size-5" />}
              title="Unified schedule"
              description="Matches and practices on one calendar, with formats, opponents, and results tracked."
            />
            <FeatureCard
              icon={<ClipboardList className="size-5" />}
              title="Availability, solved"
              description="Players set recurring availability across timezones; suggested times and a team heatmap show when everyone's actually free."
            />
            <FeatureCard
              icon={<BellRing className="size-5" />}
              title="Meets players where they are"
              description="Discord pings and browser push notifications carry reminders out — no one has to remember to check an app."
            />
            <FeatureCard
              icon={<Radio className="size-5" />}
              title="Stream-ready"
              description="See which matches are streamed, on what platform, and who's casting."
            />
            <FeatureCard
              icon={<MapPinned className="size-5" />}
              title="Venue directory"
              description="Track LAN venue addresses, capacity, and contacts for in-person events."
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

function Step({ n, title, description }: { n: number; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-sm font-semibold">
        {n}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
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
