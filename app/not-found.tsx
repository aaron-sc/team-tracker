import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Compass, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/signup", label: "Create an organization" },
  { href: "/login", label: "Log in" },
  { href: "/contact", label: "Contact us" },
];

export default function NotFound() {
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

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <Compass className="mb-4 size-12 text-primary" />
        <p className="mb-1 text-sm font-medium tracking-wide text-muted-foreground">404</p>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">This page doesn&apos;t exist</h1>
        <p className="mb-8 text-muted-foreground">
          The page you&apos;re looking for was moved, renamed, or never existed. Here&apos;s where you probably
          meant to go:
        </p>
        <div className="grid w-full gap-2 sm:grid-cols-2">
          {LINKS.map((link) => (
            <Button key={link.href} variant="outline" asChild>
              <Link href={link.href}>
                {link.label}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          ))}
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Formation — built for competitive esports organizations.
      </footer>
    </div>
  );
}
