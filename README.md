# Agreement Builder

Hackathon project: turn a PDF of two-party correspondence into a ready-to-sign contract.

Upload any PDF where two sides discuss a deal (emails, messages, meeting notes) — the app
figures out what kind of contract they need, extracts the agreed terms, asks you to fill in
only what's missing, and drafts the full agreement.

## How it works

Single-page flow (`web/app/page.tsx`):

1. **Upload** — drag & drop a PDF with the correspondence.
2. **Review** — the model identifies the contract type (service agreement, lease, home
   improvement contract, …) and decides which fields that contract needs (~10–25: parties,
   subject matter, dates, price, payment, type-specific terms). A form opens below with those
   fields; values found in the correspondence are prefilled, missing ones are highlighted amber
   so the user fills only the gaps. Anything left blank becomes a `[_______]` blank line in the
   agreement — nothing is ever invented.
3. **Generate** — the agreement streams into a scrollable panel below: numbered sections,
   the standard provisions for that contract type (plus anything required by law in the
   jurisdiction evident from the correspondence), signature blocks, and a Copy button.

## Architecture

```
web/
├── app/
│   ├── page.tsx               # the whole UI: upload → dynamic form → streamed agreement
│   └── api/
│       ├── extract/route.ts   # PDF → text → LLM (structured outputs) → contract type + fields
│       └── generate/route.ts  # text + type + confirmed fields → LLM → agreement (streamed)
└── lib/
    ├── fields.ts              # shared ContractField type (the field list itself is dynamic)
    ├── llm.ts                 # Anthropic SDK client; routes via LiteLLM proxy when configured
    └── pdf.ts                 # pdf-parse v2: PDF → plain text on the server
```

- **Stack:** Next.js 16 (App Router, Turbopack), React 19, Tailwind 4, TypeScript.
- **Model:** DeepSeek V3.2 (`openrouter/deepseek/deepseek-v3.2` via LiteLLM) with adaptive thinking.
- **Extraction** uses structured outputs (`output_config.format` json_schema) — the response is
  guaranteed-valid JSON: the contract type plus an array of fields (key, label, group, value);
  a field absent from the correspondence comes back with an empty value.
- **Generation** streams token-by-token from the API route to the browser as plain text.
- **PDF text** is extracted server-side with `pdf-parse` (pdfjs), so only text goes to the
  model — no base64 page images. `pdf-parse`/`pdfjs-dist` are in `serverExternalPackages`
  (Turbopack breaks the pdfjs worker if bundled).
- **LLM provider** is switchable in `lib/llm.ts`: with `LITE_LLM_HOST` set, calls go to the
  LiteLLM proxy's Anthropic-compatible `/v1/messages`; without it, straight to the Anthropic API.

## Running

```bash
cd web
npm install
npm run dev   # http://localhost:3000
```

`web/.env.local`:

```bash
# LiteLLM proxy (current setup)
LITE_LLM_HOST=https://your-litellm-proxy.example.com
LITE_LLM_KEY=sk-...

# — or direct Anthropic API instead —
ANTHROPIC_API_KEY=sk-ant-...
```

## Status

Working end-to-end against the live LiteLLM proxy with fixture PDFs from two different
domains (a roof-repair thread and a freelance-work thread): extraction picks a sensible
contract type and field set, fills what the thread states and leaves the rest blank;
generation streams a complete contract.

Known limitation: `pdf-parse` reads the text layer only — scanned PDFs without OCR come back
empty. Fallback idea: if extracted text is near-empty, send the PDF to the model as a document
block (the pre-pdf-parse code path) so the model reads the page images.
