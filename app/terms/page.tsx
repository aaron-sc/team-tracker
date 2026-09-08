import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms that govern using Formation to manage your esports organization.",
  alternates: { canonical: "/terms" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}

export default function TermsPage() {
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

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <Breadcrumbs items={[{ label: "Terms & Conditions" }]} />
        <h1 className="mb-1 text-3xl font-bold tracking-tight">Terms &amp; Conditions</h1>
        <p className="mb-10 text-sm text-muted-foreground">Effective September 7, 2026</p>

        <Section title="Using Formation">
          <p>
            Formation is a team-management tool for esports organizations — rosters, scheduling, availability,
            strategy, and communication in one place. By creating an account or an organization, you agree to
            these terms.
          </p>
        </Section>

        <Section title="Accounts">
          <p>
            You&apos;re responsible for the accuracy of the information you provide and for keeping your login
            credentials secure. You must be at least 13 years old to create an account.
          </p>
        </Section>

        <Section title="Your organization's data">
          <p>
            Whatever your organization enters into Formation — rosters, strategies, schedules, messages, and
            everything else — belongs to your organization. We don&apos;t claim ownership of it, and we don&apos;t
            use it for anything beyond operating Formation for you (see our{" "}
            <Link href="/privacy" className="text-primary underline underline-offset-4">
              Privacy Policy
            </Link>
            ).
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>
            Use Formation for its intended purpose. Don&apos;t attempt to abuse, overload, reverse-engineer, or
            interfere with the service; don&apos;t use it to harass, threaten, or violate the rights of others;
            and don&apos;t upload content you don&apos;t have the right to share.
          </p>
        </Section>

        <Section title="Availability & changes">
          <p>
            Formation is under active development and its feature set may change. We&apos;ll do our best to keep
            things stable and to communicate meaningful changes through the in-app &quot;What&apos;s new&quot;
            notice, but we don&apos;t guarantee uninterrupted availability.
          </p>
        </Section>

        <Section title="No warranty">
          <p>
            Formation is provided &quot;as is,&quot; without warranty of any kind, express or implied. We don&apos;t
            guarantee it will be error-free, uninterrupted, or fit for any particular purpose.
          </p>
        </Section>

        <Section title="Limitation of liability">
          <p>
            To the fullest extent permitted by law, the operator of Formation is not liable for indirect,
            incidental, or consequential damages arising from your use of the service, including data loss or a
            missed reminder.
          </p>
        </Section>

        <Section title="Termination">
          <p>
            You can stop using Formation and delete your account at any time. We may suspend or terminate access
            for an account or organization that violates these terms.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            We may update these terms as Formation changes. Continued use after an update means you accept the
            revised terms.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these terms:{" "}
            <a href="mailto:aaron.santacruz03@gmail.com" className="text-primary underline underline-offset-4">
              aaron.santacruz03@gmail.com
            </a>
            .
          </p>
        </Section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Formation — built for competitive esports organizations.
      </footer>
    </div>
  );
}
