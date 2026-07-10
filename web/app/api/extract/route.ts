import { client, MODEL } from "@/lib/llm";
import { pdfToText } from "@/lib/pdf";

const schema = {
  type: "object",
  properties: {
    contract_type: {
      type: "string",
      description:
        'The kind of contract the parties are heading towards, e.g. "Service Agreement", "Residential Lease", "Home Improvement Contract".',
    },
    fields: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string", description: "snake_case identifier, unique within the list" },
          label: { type: "string", description: 'Short human label, e.g. "Total price (USD)"' },
          group: {
            type: "string",
            description: 'Form section this field belongs to, e.g. "Parties", "Scope", "Payment"',
          },
          value: {
            type: "string",
            description:
              "Value as stated or clearly agreed in the correspondence. Empty string if never mentioned or never settled.",
          },
          multiline: { type: "boolean", description: "true for long text like a scope of work" },
        },
        required: ["key", "label", "group", "value", "multiline"],
        additionalProperties: false,
      },
    },
  },
  required: ["contract_type", "fields"],
  additionalProperties: false,
};

const PROMPT = `Below is a correspondence between two parties discussing a deal, extracted from a PDF.

Identify what kind of contract the parties need, then list every field a complete written contract of that kind requires: the parties' names and contact details, the subject matter, the key commercial terms (dates, price, payment), and the type-specific terms a lawyer would expect. Group related fields into sections (e.g. "Parties", "Scope", "Payment", "Term"). Aim for roughly 10–25 fields — everything the contract needs, nothing decorative.

For each field, return the value actually stated or clearly agreed in the correspondence — do not invent values. If a field is needed for the contract but was never mentioned or never settled, return an empty string for it. Keep amounts and dates exactly as written.`;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No PDF file provided" }, { status: 400 });
  }
  const correspondence = await pdfToText(file);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { format: { type: "json_schema", schema } },
    messages: [
      {
        role: "user",
        content: `${PROMPT}\n\n<correspondence>\n${correspondence}\n</correspondence>`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) {
    return Response.json({ error: "Extraction failed" }, { status: 502 });
  }
  return Response.json(JSON.parse(text));
}
