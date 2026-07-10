"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Check,
  CreditCard,
  FileText,
  Home as HomeIcon,
  Palette,
  ShieldCheck,
  TriangleAlert,
  Upload,
  Users,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ContractField } from "@/lib/fields";
import type { GuideKey } from "@/lib/guides";
import AgreementEditor from "./_components/AgreementEditor";
import GuidesModal from "./_components/GuidesModal";

type Phase = "idle" | "extracting" | "form" | "generating" | "done";

// The three stable screens that live in the URL hash. The transitional phases
// (extracting/generating) are deliberately absent — they're steps inside a
// transition, not screens, so they never touch the hash.
const SCREEN_OF_PHASE: Partial<Record<Phase, string>> = {
  idle: "upload",
  form: "review",
  done: "draft",
};

// Rotating status lines shown while a phase waits on the model. Rendered as a
// checklist that lights up in sequence — eye-candy over the real async call.
const EXTRACT_STEPS = [
  "Parsing the PDF",
  "Reading the correspondence",
  "Identifying the contract type",
  "Extracting the agreed terms",
  "Flagging what still needs confirming",
];

const GENERATE_STEPS = [
  "Re-reading the correspondence…",
  "Structuring the contract…",
  "Drafting the clauses…",
  "Filling in the agreed terms…",
  "Adding the standard provisions…",
  "Almost there…",
];

// Fixture threads shipped in /public/samples — a click runs them through the
// real /api/extract, so the demo path is the production path.
const SAMPLES: { file: string; label: string; sub: string; type: string; icon: LucideIcon }[] = [
  {
    file: "Gmail_Roofing_Thread.pdf",
    label: "Roof repair thread",
    sub: "Homeowner ↔ contractor emails",
    type: "Home Improvement Contract",
    icon: HomeIcon,
  },
  {
    file: "Gmail_WebDesign_Thread.pdf",
    label: "Freelance design chat",
    sub: "Client ↔ studio emails",
    type: "Freelance Services Agreement",
    icon: Palette,
  },
];

// Group name → legend icon. Unknown groups fall back to a document icon so
// extraction can return any grouping.
const GROUP_ICONS: Record<string, LucideIcon> = {
  Parties: Users,
  Project: Wrench,
  Payment: CreditCard,
  Terms: ShieldCheck,
};

export default function Home() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusStep, setStatusStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [contractType, setContractType] = useState("");
  const [fields, setFields] = useState<ContractField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [agreement, setAgreement] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [guideTab, setGuideTab] = useState<GuideKey | null>(null);
  const [hintSample, setHintSample] = useState(false);

  const agreementPreRef = useRef<HTMLPreElement>(null);
  // whether to keep the streaming panel pinned to the bottom. Flips off the
  // moment the user scrolls up, so we never fight their manual scroll.
  const stickToBottom = useRef(true);

<<<<<<< Updated upstream
=======
  // false until the first hash write, so that write can replaceState (no
  // phantom back-step) while every write after it pushes a history entry
  const hashInit = useRef(false);
  // latest routing-relevant state, read by the (mount-once) hashchange
  // listener without re-subscribing on every streamed token
  const routeStateRef = useRef({ file, fields, agreement });
  routeStateRef.current = { file, fields, agreement };

  // keep the streaming panel pinned to the bottom as text arrives
>>>>>>> Stashed changes
  useEffect(() => {
    const el = agreementPreRef.current;
    if (phase === "generating" && el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [agreement, phase]);

  // cycle the status checklist while a phase waits on the model; generation
  // lines stop as soon as the first streamed token arrives
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
    setStatusStep(0);
    const id = setInterval(() => {
      i = Math.min(i + 1, steps.length - 1);
      setStatusStep(i);
    }, 1400);
    return () => clearInterval(id);
  }, [phase, streaming]);

  // Nudge idle visitors toward the samples: if nothing has been uploaded after
  // 3s on the upload screen, light up the first sample card with a golden
  // running outline. Any move off the idle screen clears it.
  useEffect(() => {
    if (phase !== "idle" || file) {
      setHintSample(false);
      return;
    }
    const id = setTimeout(() => setHintSample(true), 3000);
    return () => clearTimeout(id);
  }, [phase, file]);

  // ── Hash routing (#upload / #review / #draft) ─────────────────────
  // phase → hash: reflect the current stable screen in the URL. Transitional
  // phases have no entry in SCREEN_OF_PHASE, so they leave the hash alone.
  useEffect(() => {
    const screen = SCREEN_OF_PHASE[phase];
    if (!screen) return;
    if (window.location.hash.slice(1) !== screen) {
      if (hashInit.current) window.location.hash = screen;
      else window.history.replaceState(null, "", `#${screen}`);
    }
    hashInit.current = true;
  }, [phase]);

  // hash → phase: follow browser back/forward, but only into a screen the
  // current in-memory state can render; otherwise fall back to upload (which
  // the effect above then writes back into the hash).
  useEffect(() => {
    function sync() {
      const { file, fields, agreement } = routeStateRef.current;
      const screen = window.location.hash.slice(1);
      if (screen === "draft" && agreement.length > 0) setPhase("done");
      else if (screen === "review" && file && fields.length > 0) setPhase("form");
      else setPhase("idle");
    }
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

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
      for (const { key, value } of data.fields) next[key] = value ?? "";
      setContractType(data.contract_type);
      setFields(data.fields);
      setValues(next);
      setPhase("form");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("idle");
    }
  }

  async function loadSample(fileName: string) {
    try {
      setError(null);
      const res = await fetch(`/samples/${fileName}`);
      if (!res.ok) throw new Error("Couldn't load the sample");
      const blob = await res.blob();
      await handleFile(new File([blob], fileName, { type: "application/pdf" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("idle");
    }
  }

  async function generate() {
    if (!file) return;
    setError(null);
    setAgreement("");
    stickToBottom.current = true;
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
      for (;;) {
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

  function reset() {
    setPhase("idle");
    setAgreement("");
    setError(null);
    setFile(null);
  }

  const requiredEmpty = fields.filter((f) => !f.optional && !values[f.key]?.trim()).length;
  const groups = [...new Set(fields.map((f) => f.group))];
  const stepIndex = phase === "idle" ? 0 : phase === "extracting" || phase === "form" ? 1 : 2;
  const isDraft = phase === "generating" || phase === "done";

  // Stepper navigation: jump back to an already-reached step (never skip ahead,
  // never interrupt an in-flight extract/generate). State persists, so hopping
  // Upload ⇄ Review ⇄ Draft doesn't lose the user's edits.
  const busy = phase === "extracting" || phase === "generating";
  const stepReachable = (i: number) =>
    !busy &&
    i <= stepIndex &&
    (i === 0 || (i === 1 && fields.length > 0) || (i === 2 && agreement.length > 0));
  function goToStep(i: number) {
    if (!stepReachable(i)) return;
    setPhase(i === 0 ? "idle" : i === 1 ? "form" : "done");
  }

  return (
    <div className="min-h-screen overflow-x-clip">
      {/* ── App header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[940px] items-center gap-2.5 px-5 py-3 sm:px-6">
          <Image src="/handshake.png" alt="" width={32} height={32} className="flex-none object-contain" />
          <div className="flex flex-col gap-1">
            <span className="font-display text-[16px] font-bold leading-none text-ink">
              Agreement Builder
            </span>
            <span className="text-[10.5px] uppercase leading-none tracking-[0.06em] text-muted">
              Two sides · one page · signed
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[940px] px-4 pb-16 pt-6 sm:px-6">
        {/* ── Stepper (centered, click to jump back) ──────────────── */}
        <div className="mb-6 flex items-center justify-center gap-1.5">
          {["Upload", "Review", "Draft"].map((name, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            const on = done || active;
            const reachable = stepReachable(i);
            return (
              <div key={name} className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => goToStep(i)}
                  disabled={!reachable || active}
                  className={`flex items-center gap-2 rounded-full px-1 py-1 transition-opacity ${
                    reachable && !active ? "hover:opacity-70" : ""
                  } ${!reachable && !active ? "cursor-default" : ""}`}
                >
                  <span
                    className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[11px] font-bold ${
                      done
                        ? "bg-success text-white"
                        : active
                          ? "bg-accent text-white"
                          : "border border-line text-muted"
                    }`}
                  >
                    {done ? <Check size={13} strokeWidth={3} className="text-white" /> : i + 1}
                  </span>
                  <span
                    className={`text-[12px] font-semibold sm:text-[12.5px] ${on ? "text-ink" : "text-muted"}`}
                  >
                    {name}
                  </span>
                </button>
                {i < 2 && (
                  <span
                    className={`h-0.5 w-4 flex-none rounded-full sm:w-[26px] ${i < stepIndex ? "bg-success" : "bg-line"}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-[22px] border border-line bg-surface shadow-[0_24px_60px_rgba(0,0,0,0.07)]">
          <div className="px-5 py-8 sm:px-8 sm:py-10">
            {/* ── SCREEN: upload ─────────────────────────────────── */}
            {phase === "idle" && (
              <div className="ab-rise">
                <h1 className="mt-1.5 text-balance font-display text-[27px] font-bold leading-[1.12] text-ink sm:text-[34px] sm:leading-[1.1]">
                  Turn the back-and-forth into a signed deal.
                </h1>
                <p className="mt-3.5 max-w-[46ch] text-[15px] leading-[1.6] text-muted">
                  Upload the emails or messages where you and the other side worked out the terms.
                  We read the thread, figure out what kind of contract it is, and draft it — filling
                  in what was agreed and flagging what&apos;s still open.
                </p>

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
                  className={`mt-[26px] flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[18px] border-2 border-dashed px-6 py-11 text-center transition-colors ${
                    dragOver
                      ? "border-accent bg-[color-mix(in_srgb,var(--color-accent)_6%,var(--color-hero))]"
                      : "border-line bg-hero hover:border-accent"
                  }`}
                >
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                      e.target.value = "";
                    }}
                  />
                  <span className="ab-float flex h-[52px] w-[52px] items-center justify-center rounded-[14px] border border-line bg-surface">
                    <Upload size={24} strokeWidth={1.8} className="text-accent" />
                  </span>
                  <span className="text-[16px] font-semibold text-ink">
                    Drop your PDF here, or click to browse
                  </span>
                  <span className="text-[13px] text-muted">
                    The correspondence where the two sides discuss the terms
                  </span>
                </label>

                <div className="mt-[22px] flex flex-wrap items-center gap-x-2.5 gap-y-2">
                  <span className="basis-full text-[12.5px] text-muted sm:basis-auto">
                    No PDF yet? Save your chat first:
                  </span>
                  {(["gmail", "whatsapp", "telegram"] as GuideKey[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => setGuideTab(k)}
                      className="rounded-full border border-line bg-surface px-3 py-[5px] text-[12px] font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
                    >
                      {k === "gmail" ? "Gmail" : k === "whatsapp" ? "WhatsApp" : "Telegram"}
                    </button>
                  ))}
                </div>

                <div className="mt-[26px] border-t border-line pt-[22px]">
                  <div className="mb-3 flex items-center gap-2">
                    <Zap size={15} strokeWidth={2} className="text-accent" />
                    <span className="text-[12.5px] font-semibold text-ink">
                      In a hurry? Skip the upload and try a sample thread
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {SAMPLES.map((s, i) => {
                      const Icon = s.icon;
                      const hinted = i === 0 && hintSample;
                      return (
                        <button
                          key={s.file}
                          onClick={() => loadSample(s.file)}
                          onMouseEnter={() => setHintSample(false)}
                          className={`flex items-center gap-3 rounded-[14px] border border-line bg-surface p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_8px_20px_color-mix(in_srgb,var(--color-accent)_18%,transparent)] ${
                            hinted ? "ab-hint" : ""
                          }`}
                        >
                          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px] bg-hero text-accent">
                            <Icon size={19} strokeWidth={1.9} />
                          </span>
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="text-[13.5px] font-semibold text-ink">{s.label}</span>
                            <span className="text-[11.5px] text-muted">
                              {s.sub} · {s.type}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {error && <p className="mt-4 text-[13px] text-red-600">{error}</p>}
              </div>
            )}

            {/* ── SCREEN: extracting ─────────────────────────────── */}
            {phase === "extracting" && (
              <div className="ab-rise flex flex-col items-center py-6 text-center">
                <div className="relative flex h-[74px] w-[74px] items-center justify-center">
                  <span className="ab-spin absolute inset-0 rounded-full border-[3px] border-line border-t-accent" />
                  <Image
                    src="/handshake.png"
                    alt=""
                    width={40}
                    height={40}
                    className="ab-pulse object-contain"
                  />
                </div>
                <h2 className="mb-1 mt-5 font-display text-[22px] font-bold text-ink">
                  Reading the correspondence…
                </h2>
                {file && (
                  <div className="mt-1.5 inline-flex items-center gap-2 rounded-full bg-hero px-3 py-1.5 text-[12.5px] text-muted">
                    <FileText size={14} strokeWidth={1.8} />
                    {file.name}
                  </div>
                )}
                <div className="mt-[26px] flex w-full max-w-[420px] flex-col gap-2.5 text-left">
                  {EXTRACT_STEPS.map((label, i) => {
                    const done = i < statusStep;
                    const active = i === statusStep;
                    return (
                      <div
                        key={label}
                        className="flex items-center gap-3 rounded-[12px] border border-line bg-surface px-3.5 py-3 transition-all"
                        style={{ opacity: done || active ? 1 : 0.45 }}
                      >
                        <span
                          className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[12px] font-bold ${
                            done
                              ? "bg-success"
                              : active
                                ? "ab-ring border-2 border-accent bg-transparent"
                                : "border-2 border-line bg-transparent"
                          }`}
                        >
                          {done && <Check size={13} strokeWidth={3} className="text-white" />}
                        </span>
                        <span className="text-[13.5px] font-medium text-ink">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── SCREEN: review ─────────────────────────────────── */}
            {phase === "form" && (
              <div className="ab-rise">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-[26px] font-bold text-ink">Review the terms</h2>
                    <p className="mt-2 max-w-[52ch] text-[13.5px] text-muted">
                      Values found in your thread are filled in. Confirm anything that looks off —
                      required fields must be set, optional ones you skip are simply left out.
                    </p>
                  </div>
                  {contractType && (
                    <span className="ab-pop inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[color-mix(in_srgb,var(--color-accent)_12%,var(--color-surface))] px-3.5 py-[7px] text-[12.5px] font-bold text-accent2">
                      <Check size={14} strokeWidth={2} />
                      {contractType}
                    </span>
                  )}
                </div>

                {requiredEmpty > 0 ? (
                  <div className="mt-[18px] flex items-center gap-2.5 rounded-[12px] border border-[color-mix(in_srgb,var(--color-danger)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_9%,var(--color-surface))] px-3.5 py-3">
                    <TriangleAlert size={18} strokeWidth={2} className="flex-none text-danger" />
                    <span className="text-[13px] text-ink">
                      <strong>
                        {requiredEmpty} required field{requiredEmpty > 1 ? "s" : ""}
                      </strong>{" "}
                      still need filling — highlighted below. Optional fields left blank are simply
                      left out of the agreement.
                    </span>
                  </div>
                ) : (
                  <div className="mt-[18px] flex items-center gap-2.5 rounded-[12px] border border-[color-mix(in_srgb,var(--color-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-accent)_10%,var(--color-surface))] px-3.5 py-3">
                    <Check size={18} strokeWidth={2} className="flex-none text-accent" />
                    <span className="text-[13px] text-ink">
                      All required details are in — edit anything that looks off, then draft.
                    </span>
                  </div>
                )}

                <div className="mt-5 flex flex-col gap-4">
                  {groups.map((group, gi) => {
                    const Icon = GROUP_ICONS[group] ?? FileText;
                    return (
                      <fieldset
                        key={group}
                        className="ab-rise m-0 rounded-[14px] border border-line bg-surface px-[18px] pb-[18px] pt-4"
                        style={{ animationDelay: `${gi * 0.08}s` }}
                      >
                        <legend className="flex items-center gap-1.5 px-2 text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
                          <Icon size={14} strokeWidth={2} />
                          {group}
                        </legend>
                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                          {fields
                            .filter((f) => f.group === group)
                            .map((f) => {
                              const empty = !values[f.key]?.trim();
                              const highlight = empty && !f.optional;
                              return (
                                <div key={f.key} className={f.multiline ? "sm:col-span-2" : ""}>
                                  <label className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold text-ink">
                                    {f.label}
                                    {highlight ? (
                                      <span className="text-[9.5px] font-bold uppercase tracking-[0.05em] text-danger">
                                        required
                                      </span>
                                    ) : (
                                      empty && (
                                        <span className="text-[9.5px] font-bold uppercase tracking-[0.05em] text-muted">
                                          optional
                                        </span>
                                      )
                                    )}
                                  </label>
                                  {f.multiline ? (
                                    <textarea
                                      rows={2}
                                      className={`ab-input resize-y ${highlight ? "ab-input-required" : ""}`}
                                      value={values[f.key] ?? ""}
                                      onChange={(e) =>
                                        setValues((v) => ({ ...v, [f.key]: e.target.value }))
                                      }
                                    />
                                  ) : (
                                    <input
                                      className={`ab-input ${highlight ? "ab-input-required" : ""}`}
                                      value={values[f.key] ?? ""}
                                      onChange={(e) =>
                                        setValues((v) => ({ ...v, [f.key]: e.target.value }))
                                      }
                                    />
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </fieldset>
                    );
                  })}
                </div>

                <div className="mt-[22px] flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={reset}
                    className="rounded-[11px] border border-line bg-transparent px-[18px] py-[11px] text-[14px] font-semibold text-muted transition-colors hover:border-muted hover:text-ink"
                  >
                    ← Start over
                  </button>
                  <div className="flex flex-col items-end gap-1.5">
                    <button
                      onClick={generate}
                      disabled={requiredEmpty > 0}
                      className="ab-btn-primary inline-flex items-center gap-2.5 rounded-[11px] px-[22px] py-3 text-[14.5px] font-bold"
                    >
                      Draft the agreement
                      <ArrowRight size={17} strokeWidth={2.2} className={requiredEmpty > 0 ? "" : "ab-nudge"} />
                    </button>
                    {requiredEmpty > 0 && (
                      <span className="text-[12px] text-danger">
                        Fill the {requiredEmpty} required field{requiredEmpty > 1 ? "s" : ""} first.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── SCREEN: draft (generating + done) ──────────────── */}
            {isDraft && (
              <div className="ab-rise">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-[26px] font-bold text-ink">Your agreement</h2>
                    <p className="mt-1.5 text-[13px] text-muted">{contractType}</p>
                  </div>
                  {phase === "generating" && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-hero px-3.5 py-2 text-[12.5px] font-semibold text-muted">
                      <span className="ab-pulse-fast h-2 w-2 rounded-full bg-accent" />
                      Drafting…
                    </span>
                  )}
                </div>

                {phase === "done" && (
                  <div className="ab-pop mt-4 flex items-center gap-2.5 rounded-[12px] border border-[color-mix(in_srgb,var(--color-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-accent)_10%,var(--color-surface))] px-3.5 py-3">
                    <Image src="/handshake.png" alt="" width={26} height={26} className="object-contain" />
                    <span className="text-[13px] text-ink">
                      <strong>Ready to sign.</strong> Review and edit below, then export or send for
                      signature.
                    </span>
                  </div>
                )}

                {phase === "generating" && !agreement ? (
                  <div className="mt-4 flex items-center gap-3 rounded-[14px] border border-line bg-surface px-6 py-8 text-muted">
                    <span className="ab-spin h-5 w-5 rounded-full border-2 border-line border-t-accent" />
                    <span className="text-[14px]">{GENERATE_STEPS[statusStep]}</span>
                  </div>
                ) : phase === "generating" ? (
                  <pre
                    ref={agreementPreRef}
                    onScroll={(e) => {
                      const el = e.currentTarget;
                      // still "stuck" only if the user is within 40px of the bottom
                      stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
                    }}
                    className="mt-4 max-h-[56vh] overflow-y-auto whitespace-pre-wrap break-words rounded-[14px] border border-line bg-surface px-7 py-6 font-contract text-[14px] leading-[1.75] text-ink shadow-[0_12px_30px_rgba(0,0,0,0.05)]"
                  >
                    {agreement}
                    <span className="ab-blink ml-0.5 inline-block w-2 bg-accent">&nbsp;</span>
                  </pre>
                ) : (
                  <div className="mt-4">
                    <AgreementEditor initialText={agreement} onChange={setAgreement} />
                    <div className="mt-[18px]">
                      <button
                        onClick={reset}
                        className="rounded-[11px] border border-line bg-transparent px-[18px] py-2.5 text-[13.5px] font-semibold text-muted transition-colors hover:border-muted hover:text-ink"
                      >
                        ← Draft another
                      </button>
                    </div>
                  </div>
                )}

                {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {guideTab && <GuidesModal initialTab={guideTab} onClose={() => setGuideTab(null)} />}
    </div>
  );
}
