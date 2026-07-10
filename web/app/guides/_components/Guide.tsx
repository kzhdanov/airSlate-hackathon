import Link from "next/link";
import type { ReactNode } from "react";

export type GuideSection = { heading?: string; steps: ReactNode[] };

export default function Guide({
  title,
  intro,
  sections,
  note,
}: {
  title: string;
  intro: string;
  sections: GuideSection[];
  note?: string;
}) {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-12">
      <Link href="/" className="text-sm font-semibold text-accent hover:text-accent2">
        ← Back to Agreement Builder
      </Link>

      <header>
        <h1 className="font-display text-3xl font-bold text-ink">{title}</h1>
        <p className="mt-2 text-muted">{intro}</p>
      </header>

      {sections.map((section, i) => (
        <section key={i} className="space-y-3">
          {section.heading && (
            <h2 className="font-display text-lg font-semibold text-ink">{section.heading}</h2>
          )}
          <ol className="list-decimal space-y-2 pl-6 text-[15px] leading-relaxed text-ink">
            {section.steps.map((step, j) => (
              <li key={j}>{step}</li>
            ))}
          </ol>
        </section>
      ))}

      {note && (
        <p className="rounded-[11px] border border-line bg-hero p-4 text-sm text-muted">{note}</p>
      )}
    </main>
  );
}
