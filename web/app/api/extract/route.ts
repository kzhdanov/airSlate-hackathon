import { client, MODEL } from "@/lib/llm";
import { pdfToText } from "@/lib/pdf";
import { today } from "@/lib/date";

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
          optional: {
            type: "boolean",
            description:
              "true if this field may legitimately not apply to this particular deal and the contract still stands without it; false for the core fields every such contract must have.",
          },
        },
        required: ["key", "label", "group", "value", "multiline", "optional"],
        additionalProperties: false,
      },
    },
  },
  required: ["contract_type", "fields"],
  additionalProperties: false,
};

const prompt = (todayStr: string) => `Below is a correspondence between two parties discussing a deal, extracted from a PDF.

Identify what kind of contract the parties need, then list every field the final written contract will need as a fill-in. Be exhaustive about data points — the finished contract must contain no blank lines, so every specific value it references has to be a field here. Break compound facts into atomic fields: street, city and state as separate fields; a party's legal name and its entity type (e.g. LLC, corporation, individual) as separate fields. Cover the parties' names, entity types, addresses and contact details, the subject matter, the commercial terms (dates, price, payment), and the type-specific terms a lawyer would expect. Group related fields into sections (e.g. "Parties", "Scope", "Payment", "Term"). It is better to ask one extra field than to leave a blank in the final contract — but mark such an extra as optional (set "optional": true) when it may not apply to this particular deal and the contract still stands without it. Set "optional": false for the core fields every contract of this type must have.

For each field, return the value actually stated or clearly agreed in the correspondence — do not invent party-specific facts. Keep amounts and dates exactly as written. If a field was never mentioned, return an empty string so we can ask the user — EXCEPT for fields that have an obvious universal default, which you should pre-fill: use today's date (${todayStr}) for an effective/agreement date. Leave empty only the fields that genuinely require the user's input.`;

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
    output_config: { format: { type: "json_schema", schema } },
    messages: [
      {
        role: "user",
        content: `${prompt(today())}\n\n<correspondence>\n${correspondence}\n</correspondence>`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) {
    return Response.json({ error: "Extraction failed" }, { status: 502 });
  }
  return Response.json(JSON.parse(text));
}
