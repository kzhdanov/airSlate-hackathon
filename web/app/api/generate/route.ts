import { client, MODEL } from "@/lib/llm";
import { pdfToText } from "@/lib/pdf";
import type { ContractField } from "@/lib/fields";

const PROMPT = `You are drafting a formal written contract. Below is the correspondence between two parties discussing the deal (extracted from a PDF), followed by the contract type and the contract details confirmed by the user (these take precedence over the correspondence).

Draft a complete, ready-to-sign contract of the stated type. Include the standard provisions such a contract needs (parties, subject matter, obligations, price and payment, term and dates, warranties, liability, termination, governing law, signature blocks), plus any provisions required by law for this contract type in the jurisdiction evident from the correspondence.

Rules:
- Use the confirmed details verbatim. For anything still unknown, insert a blank like [_______] — never invent facts.
- Where the correspondence contains specific agreed points not covered by the fields (e.g. side promises, access, cleanup), incorporate them into the relevant sections.
- Output plain text only (no markdown symbols), formatted as a contract: title, numbered sections with headings in capitals, signature blocks at the end.`;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  const fieldsJson = form.get("fields");
  const contractType = form.get("contract_type");
  if (!(file instanceof File) || typeof fieldsJson !== "string" || typeof contractType !== "string") {
    return Response.json({ error: "Missing file, fields or contract_type" }, { status: 400 });
  }
  const correspondence = await pdfToText(file);

  const fields: ContractField[] = JSON.parse(fieldsJson);
  const details = fields
    .map((f) => `${f.group} — ${f.label}: ${f.value?.trim() || "[not provided]"}`)
    .join("\n");

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    thinking: { type: "adaptive" },
    messages: [
      {
        role: "user",
        content: `${PROMPT}\n\n<correspondence>\n${correspondence}\n</correspondence>\n\nContract type: ${contractType}\n\nConfirmed contract details:\n${details}`,
      },
    ],
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
