import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";

export const metadata: Metadata = {
  title: "Thanks for reaching out",
  description: "Your message has been sent to the Formation team.",
  robots: { index: false, follow: true },
};

export default function ContactThankYouPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold">
            <Logo />
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 py-12">
        <Breadcrumbs items={[{ label: "Contact", href: "/contact" }, { label: "Thank you" }]} />
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <CheckCircle2 className="mb-4 size-12 text-primary" />
          <h1 className="mb-2 text-2xl font-bold tracking-tight">Message sent</h1>
          <p className="mb-8 max-w-sm text-muted-foreground">
            Thanks for reaching out — we&apos;ll get back to you soon. In the meantime, feel free to look around.
          </p>
          <Button asChild>
            <Link href="/">
              Back to home
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Formation — built for competitive esports organizations.
      </footer>
    </div>
  );
}
