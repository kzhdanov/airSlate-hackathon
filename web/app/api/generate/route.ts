import { client, MODEL } from "@/lib/llm";
import { pdfToText } from "@/lib/pdf";
import { today } from "@/lib/date";
import type { ContractField } from "@/lib/fields";

const prompt = (todayStr: string) => `You are drafting a formal written contract. Below is the correspondence between two parties discussing the deal (extracted from a PDF), followed by the contract type and the contract details confirmed by the user (these take precedence over the correspondence).

Draft a complete, ready-to-sign contract of the stated type. Include the standard provisions such a contract needs (parties, subject matter, obligations, price and payment, term and dates, warranties, liability, termination, governing law, signature blocks), plus any provisions required by law for this contract type in the jurisdiction evident from the correspondence.

Rules:
- Use the confirmed details verbatim. All required details are provided; a few optional ones may be marked [not provided].
- Do NOT insert any placeholder or blank line (like [____] or ______) anywhere in the body of the contract. When a detail is marked [not provided], omit that point or clause entirely rather than writing a blank — never force a provision that has no value. The ONLY blanks allowed are in the signature block: a line for each party's signature and the date of signing.
- For an obvious universal default, use it directly rather than a blank: today's date is ${todayStr}.
- Never invent party-specific facts (names, addresses, amounts).
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
    messages: [
      {
        role: "user",
        content: `${prompt(today())}\n\n<correspondence>\n${correspondence}\n</correspondence>\n\nContract type: ${contractType}\n\nConfirmed contract details:\n${details}`,
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
