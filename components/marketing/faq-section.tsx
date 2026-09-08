const FAQS = [
  {
    question: "Is Formation free to use?",
    answer:
      "Creating an organization and inviting your roster is self-serve — no credit card, no sales call. Reach out through the contact page if you want to talk through your org's specific needs first.",
  },
  {
    question: "Will my players actually use it?",
    answer:
      "That's the design goal, not an afterthought. Reminders reach players through Discord and browser push instead of requiring them to remember to open another app, and a Discord bot lets them set availability without ever leaving their server.",
  },
  {
    question: "Does Formation work for games other than Valorant?",
    answer:
      "Yes — teams, rosters, scheduling, and strategy playbooks are built to work with any game. The game-selection dropdown covers Valorant, League of Legends, Rocket League, Overwatch 2, Counter-Strike 2, and more.",
  },
  {
    question: "Can I import my existing roster and schedule?",
    answer:
      "There's no bulk importer yet — rosters and schedules are added directly in the app, which takes a few minutes for a typical org. If you're migrating a large org, contact us and we'll help.",
  },
  {
    question: "Is my organization's data private from other organizations?",
    answer:
      "Yes. Every organization's rosters, schedules, and strategies are completely isolated from every other organization on Formation — there's no cross-org visibility of any kind.",
  },
];

export function FaqSection() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <h2 className="mb-10 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
        Frequently asked questions
      </h2>
      <div className="space-y-2">
        {FAQS.map((faq) => (
          <details key={faq.question} className="group rounded-lg border p-4">
            <summary className="cursor-pointer list-none font-medium marker:content-none">
              <span className="flex items-center justify-between gap-4">
                {faq.question}
                <span className="shrink-0 text-muted-foreground transition-transform group-open:rotate-45">+</span>
              </span>
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
