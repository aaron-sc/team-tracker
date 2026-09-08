import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { ContactForm } from "@/components/marketing/contact-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions about Formation? Get in touch and we'll get back to you.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
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

      <main className="mx-auto w-full max-w-lg flex-1 px-6 py-12">
        <Breadcrumbs items={[{ label: "Contact" }]} />
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Get in touch</h1>
        <p className="mb-8 text-muted-foreground">
          Running an esports org and curious whether Formation fits? Have a question before you sign up? Send a
          message and we&apos;ll get back to you.
        </p>
        <Card>
          <CardContent className="pt-6">
            <ContactForm />
          </CardContent>
        </Card>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Formation — built for competitive esports organizations.
      </footer>
    </div>
  );
}
