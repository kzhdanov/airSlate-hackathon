import { PDFParse } from "pdf-parse";

export async function pdfToText(file: File): Promise<string> {
  const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}
