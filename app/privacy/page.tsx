import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Formation collects, uses, and protects your organization's data.",
  alternates: { canonical: "/privacy" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
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
        <Breadcrumbs items={[{ label: "Privacy Policy" }]} />
        <h1 className="mb-1 text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mb-10 text-sm text-muted-foreground">Effective September 7, 2026</p>

        <Section title="What this covers">
          <p>
            This policy covers Formation as a whole — the web app your organization uses to manage rosters,
            scheduling, strategy, and communication. The Discord bot component has its own, more detailed{" "}
            <a href="https://claude.ai/code/artifact/dcbaaa82-3601-43f1-970d-cb600f1616c9" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
              Bot Privacy Policy
            </a>{" "}
            covering exactly what it collects inside Discord.
          </p>
        </Section>

        <Section title="Information we collect">
          <p>
            <strong className="text-foreground">Account information</strong>: name, email address, password
            (stored as a salted hash, never in plain text), timezone, time-format preference, and an optional
            avatar, phone number, and Discord handle.
          </p>
          <p>
            <strong className="text-foreground">Organization data</strong>: whatever your organization enters —
            rosters, jerseys, positions, in-game names, player bios and tracker links, schedules, match results,
            availability, strategies and playbooks, match/practice discussion messages, recruitment prospects,
            gear inventory, expenses, and audit logs of sensitive actions.
          </p>
          <p>
            <strong className="text-foreground">Device information</strong>: if you enable browser push
            notifications, we store the subscription your browser gives us so we can deliver them — we can&apos;t
            read anything else about your device from this.
          </p>
          <p>
            <strong className="text-foreground">Usage data</strong>: if analytics are enabled for this
            deployment, aggregate, anonymized-where-possible usage data (pages visited, general location by
            country/region, device type) via Google Analytics — see &quot;Cookies &amp; analytics&quot; below.
          </p>
        </Section>

        <Section title="How we use it">
          <p>
            Strictly to operate Formation for your organization: authenticating you, displaying and syncing the
            data your org enters, sending the reminders and notifications your org or you individually configure,
            and understanding how the product is used well enough to improve it. We don&apos;t sell data, and we
            don&apos;t use your organization&apos;s roster or strategy data for advertising.
          </p>
        </Section>

        <Section title="Cookies & analytics">
          <p>
            Formation sets a session cookie so you stay logged in — this one is required for the app to function
            and isn&apos;t optional. If Google Analytics is enabled for this deployment, it sets additional
            cookies to measure usage; those only load after you accept them in the cookie banner, and you can
            decline them without losing access to anything.
          </p>
        </Section>

        <Section title="Third parties">
          <p>
            Data is shared only with the services needed to run features you or your organization turn on:
            Discord (if you connect the bot or a webhook), your browser&apos;s push service (if you enable push
            notifications), Riot Games or Steam (only if you sync game stats, and only for the account you give
            us), and Google Analytics (only if enabled and only after cookie consent). None of these receive more
            than the specific data their feature requires.
          </p>
        </Section>

        <Section title="Data retention & deletion">
          <p>
            Your organization&apos;s data persists as long as the organization exists in Formation. You can
            disconnect individual integrations (Discord, push notifications) at any time from your account or
            organization settings, which deletes the associated stored data immediately. To request deletion of
            an account or an entire organization&apos;s data, contact us using the details below.
          </p>
        </Section>

        <Section title="Security">
          <p>
            Passwords are hashed, never stored or logged in plain text. Sensitive endpoints (login, signup,
            password reset) are rate-limited. Every sensitive change — role changes, permission grants, data
            resets — is written to an audit log your organization&apos;s admins can review. Traffic is served
            over HTTPS only.
          </p>
        </Section>

        <Section title="Children's privacy">
          <p>Formation is not directed at children and is not intended for use by anyone under 13.</p>
        </Section>

        <Section title="Built with AI assistance">
          <p>
            In the interest of transparency: substantial parts of Formation&apos;s codebase were built with the
            assistance of AI tools (Claude, by Anthropic), directed and reviewed by a human developer. No user or
            organization data is used to train any AI model — AI assistance here refers to how the software was
            written, not how your data is processed once the app is running.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            This page may be updated as Formation&apos;s features change. Material changes will update the
            effective date above.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions or data requests:{" "}
            <a href="mailto:aaron.santacruz03@gmail.com" className="text-primary underline underline-offset-4">
              aaron.santacruz03@gmail.com
            </a>
            . See also our{" "}
            <Link href="/terms" className="text-primary underline underline-offset-4">
              Terms &amp; Conditions
            </Link>
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
