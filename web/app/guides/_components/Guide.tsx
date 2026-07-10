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
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-8">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← Back to Agreement Builder
      </Link>

      <header>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-gray-500">{intro}</p>
      </header>

      {sections.map((section, i) => (
        <section key={i} className="space-y-3">
          {section.heading && <h2 className="text-lg font-semibold">{section.heading}</h2>}
          <ol className="list-decimal space-y-2 pl-6 text-[15px] leading-relaxed text-gray-800">
            {section.steps.map((step, j) => (
              <li key={j}>{step}</li>
            ))}
          </ol>
        </section>
      ))}

      {note && (
        <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          {note}
        </p>
      )}
    </main>
  );
}
