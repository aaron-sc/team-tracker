import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  CalendarClock,
  Radio,
  Users,
  MapPinned,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";

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
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Run your esports org like a pro.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Rosters, custom roles, match &amp; practice scheduling, player availability,
            venue logistics, and recruitment pipelines — all in one place.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/signup">Create your organization</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">I have an account</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
              icon={<Radio className="size-5" />}
              title="Stream-ready"
              description="See which matches are streamed, on what platform, and who's casting."
            />
            <FeatureCard
              icon={<ClipboardList className="size-5" />}
              title="Availability & conflicts"
              description="Players set recurring availability; conflicts with scheduled sessions surface automatically."
            />
            <FeatureCard
              icon={<MapPinned className="size-5" />}
              title="Venue directory"
              description="Track LAN venue addresses, capacity, and contacts for in-person events."
            />
            <FeatureCard
              icon={<ShieldCheck className="size-5" />}
              title="Recruitment pipeline"
              description="Scout high school, college, and pro prospects through a full pipeline with notes and history."
            />
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Formation — built for competitive esports organizations.
      </footer>
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
    <div className="rounded-lg border bg-card p-6 text-left shadow-sm">
      <div className="mb-3 flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
