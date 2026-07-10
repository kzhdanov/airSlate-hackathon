"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ContractField } from "@/lib/fields";
import AgreementEditor from "./_components/AgreementEditor";

type Phase = "idle" | "extracting" | "form" | "generating" | "done";

// Rotating status lines shown while a phase is waiting on the model. The last
// line is safe to linger on since it just reads as "still working".
const EXTRACT_STEPS = [
  "Parsing the PDF…",
  "Reading the correspondence…",
  "Figuring out the contract type…",
  "Working out which details are needed…",
  "Almost done…",
];

const GENERATE_STEPS = [
  "Re-reading the correspondence…",
  "Structuring the contract…",
  "Drafting the clauses…",
  "Filling in the agreed terms…",
  "Adding the standard provisions…",
  "Almost there…",
];

export default function Home() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [contractType, setContractType] = useState("");
  const [fields, setFields] = useState<ContractField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [agreement, setAgreement] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);
  const agreementRef = useRef<HTMLDivElement>(null);
  const agreementPreRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (phase === "form") formRef.current?.scrollIntoView({ behavior: "smooth" });
    if (phase === "generating") agreementRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [phase]);

  // keep the agreement panel scrolled to the bottom while text streams in
  useEffect(() => {
    const el = agreementPreRef.current;
    if (phase === "generating" && el) el.scrollTop = el.scrollHeight;
  }, [agreement, phase]);

  // cycle through status lines while a phase waits on the model; generation
  // messages stop as soon as the first streamed token arrives
  const streaming = agreement.length > 0;
  useEffect(() => {
    const steps =
      phase === "extracting"
        ? EXTRACT_STEPS
        : phase === "generating" && !streaming
          ? GENERATE_STEPS
          : null;
    if (!steps) return;
    let i = 0;
    setStatus(steps[0]);
    const id = setInterval(() => {
      i = Math.min(i + 1, steps.length - 1);
      setStatus(steps[i]);
    }, 2000);
    return () => clearInterval(id);
  }, [phase, streaming]);

  async function handleFile(f: File) {
    if (f.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }
    setError(null);
    setFile(f);
    setAgreement("");
    setPhase("extracting");
    try {
      const form = new FormData();
      form.append("file", f);
      const res = await fetch("/api/extract", { method: "POST", body: form });
      if (!res.ok) throw new Error(`Extraction failed (${res.status})`);
      const data = (await res.json()) as { contract_type: string; fields: ContractField[] };
      const next: Record<string, string> = {};
      for (const { key, value } of data.fields) {
        next[key] = value ?? "";
      }
      setContractType(data.contract_type);
      setFields(data.fields);
      setValues(next);
      setPhase("form");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("idle");
    }
  }

  async function generate() {
    if (!file) return;
    setError(null);
    setAgreement("");
    setPhase("generating");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("contract_type", contractType);
      form.append(
        "fields",
        JSON.stringify(fields.map((f) => ({ ...f, value: values[f.key] ?? "" }))),
      );
      const res = await fetch("/api/generate", { method: "POST", body: form });
      if (!res.ok || !res.body) throw new Error(`Generation failed (${res.status})`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAgreement((prev) => prev + decoder.decode(value, { stream: true }));
      }
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("form");
    }
  }

  const requiredEmpty = fields.filter((f) => !f.optional && !values[f.key]?.trim()).length;
  const groups = [...new Set(fields.map((f) => f.group))];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-10">
      <header>
        <h1 className="text-3xl font-bold">Agreement Builder</h1>
        <p className="mt-2 text-gray-500">
          Been going back and forth with a contractor and finally ready to sign? With our
          service it&apos;s a breeze — just upload your correspondence as a PDF and we&apos;ll
          turn it into a ready-to-sign contract.
        </p>
        <p className="mt-3 text-sm text-gray-500">
          Need to turn your chat into a PDF first? See how for{" "}
          <Link href="/guides/gmail" className="text-blue-600 hover:underline">
            Gmail
          </Link>
          ,{" "}
          <Link href="/guides/whatsapp" className="text-blue-600 hover:underline">
            WhatsApp
          </Link>
          , or{" "}
          <Link href="/guides/telegram" className="text-blue-600 hover:underline">
            Telegram
          </Link>
          .
        </p>
      </header>

      {/* Step 1 — upload */}
      <section>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
            dragOver ? "border-blue-500 bg-blue-500/5" : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            disabled={phase === "extracting" || phase === "generating"}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          {phase === "extracting" ? (
            <>
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <span className="text-gray-500">{status}</span>
            </>
          ) : (
            <>
              <span className="text-lg font-medium">
                {file ? file.name : "Drop a PDF here or click to browse"}
              </span>
              <span className="text-sm text-gray-500">
                Emails or messages where the two sides discuss the terms
              </span>
            </>
          )}
        </label>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      {/* Step 2 — review & fill in */}
      {(phase === "form" || phase === "generating" || phase === "done") && (
        <section ref={formRef} className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Review the details</h2>
            <p className="mt-1 text-sm text-gray-500">
              {contractType && (
                <>
                  Drafting: <span className="font-medium text-gray-700">{contractType}</span>.{" "}
                </>
              )}
              {requiredEmpty > 0
                ? `${requiredEmpty} required field${requiredEmpty > 1 ? "s" : ""} still to fill in — highlighted below. Optional fields you leave blank are simply left out of the agreement, not rendered as blanks.`
                : "All required details are in — edit anything that looks off; optional fields are yours to fill or skip."}
            </p>
          </div>

          {groups.map((group) => (
            <fieldset key={group} className="rounded-xl border border-gray-200 p-5">
              <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                {group}
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {fields.filter((f) => f.group === group).map((f) => {
                  const empty = !values[f.key]?.trim();
                  const highlight = empty && !f.optional;
                  const cls = `w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-blue-500 ${
                    highlight ? "border-amber-400 bg-amber-400/10" : "border-gray-300"
                  }`;
                  return (
                    <div key={f.key} className={f.multiline ? "sm:col-span-2" : ""}>
                      <label className="mb-1 block text-sm font-medium">
                        {f.label}
                        {highlight ? (
                          <span className="ml-2 text-xs text-amber-600">required</span>
                        ) : (
                          empty && <span className="ml-2 text-xs text-gray-400">optional</span>
                        )}
                      </label>
                      {f.multiline ? (
                        <textarea
                          rows={3}
                          className={cls}
                          value={values[f.key] ?? ""}
                          onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                        />
                      ) : (
                        <input
                          className={cls}
                          value={values[f.key] ?? ""}
                          onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <div className="space-y-2">
            <button
              onClick={generate}
              disabled={phase === "generating" || requiredEmpty > 0}
              className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {phase === "generating" ? "Generating agreement…" : "Generate agreement"}
            </button>
            {requiredEmpty > 0 && phase !== "generating" && (
              <p className="text-sm text-amber-600">
                Fill in the {requiredEmpty} required field{requiredEmpty > 1 ? "s" : ""} first — the
                agreement can&apos;t contain blanks.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Step 3 — the agreement */}
      {(phase === "generating" || phase === "done") && (
        <section ref={agreementRef} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your agreement</h2>
            {phase === "done" && (
              <button
                onClick={() => navigator.clipboard.writeText(agreement)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
              >
                Copy
              </button>
            )}
          </div>
          {phase === "generating" && !agreement ? (
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-8 text-gray-500 shadow-sm">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <span>{status}</span>
            </div>
          ) : phase === "generating" ? (
            <pre
              ref={agreementPreRef}
              className="max-h-[70vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-8 font-serif text-[15px] leading-relaxed text-gray-900 shadow-sm"
            >
              {agreement}
              <span className="animate-pulse">▍</span>
            </pre>
          ) : (
            <>
              <p className="text-sm text-gray-500">
                Edit the draft directly — click into the text to make changes before you sign.
              </p>
              <AgreementEditor initialText={agreement} onChange={setAgreement} />
            </>
          )}
        </section>
      )}
    </main>
  );
}
