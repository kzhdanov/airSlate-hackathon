"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { guides, GUIDE_ORDER, type GuideKey } from "@/lib/guides";

// "Save your chat as a PDF" overlay. Centered card on desktop, bottom-sheet on
// mobile. Backdrop click and Escape close it.
export default function GuidesModal({
  initialTab,
  onClose,
}: {
  initialTab: GuideKey;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<GuideKey>(initialTab);

  useEffect(() => setTab(initialTab), [initialTab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const guide = guides[tab];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-center bg-[rgba(20,16,12,0.45)] backdrop-blur-[3px] items-end sm:items-center sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Save your chat as a PDF"
        className="ab-rise flex max-h-[82%] w-full flex-col overflow-hidden border border-line bg-surface shadow-[0_-8px_50px_rgba(0,0,0,0.26)] rounded-t-[22px] sm:max-h-[86%] sm:max-w-[520px] sm:rounded-[18px] sm:shadow-[0_24px_60px_rgba(0,0,0,0.18)]"
      >
        {/* mobile drag handle */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <span className="h-1 w-9 rounded-full bg-line" />
        </div>

        <div className="sticky top-0 z-[2] flex items-center justify-between border-b border-line bg-surface px-5 py-3.5">
          <span className="font-display text-[16px] font-bold text-ink">Save your chat as a PDF</span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-line text-muted transition-colors hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-1.5 px-5 pt-3.5">
          {GUIDE_ORDER.map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`border-b-2 px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                tab === k
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {guides[k].label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto px-[22px] pb-6 pt-4">
          <h3 className="mb-1 mt-1.5 font-display text-[19px] font-bold text-ink">{guide.title}</h3>
          <p className="mb-3.5 text-[13.5px] leading-[1.55] text-muted">{guide.intro}</p>
          <ol className="flex list-decimal flex-col gap-2.5 pl-5">
            {guide.steps.map((step, i) => (
              <li key={i} className="text-[13.5px] leading-[1.55] text-ink">
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-[11px] bg-hero px-3.5 py-3 text-[12.5px] leading-[1.5] text-muted">
            {guide.note}
          </p>
        </div>
      </div>
    </div>
  );
}
