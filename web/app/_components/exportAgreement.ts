import {
  $getRoot,
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
  type ElementNode,
  type LexicalEditor,
} from "lexical";
import { $isListNode } from "@lexical/list";
import { $isHeadingNode } from "@lexical/rich-text";

// The editor content, flattened into paragraphs of formatted runs. This is the
// single source the three exporters share, so PDF / Word / Print stay in sync
// and all carry the bold/italic the user applied in the toolbar.
type Run = { text: string; bold: boolean; italic: boolean } | { br: true };
type Block = Run[];

// Collect the inline runs inside one element (text + soft breaks), recursing
// through any wrapping inline elements (e.g. links).
function inlineRuns(node: ElementNode): Run[] {
  const runs: Run[] = [];
  for (const child of node.getChildren()) {
    if ($isLineBreakNode(child)) runs.push({ br: true });
    else if ($isTextNode(child))
      runs.push({
        text: child.getTextContent(),
        bold: child.hasFormat("bold"),
        italic: child.hasFormat("italic"),
      });
    else if ($isElementNode(child)) runs.push(...inlineRuns(child));
  }
  return runs;
}

// Leading whitespace for an indented block (4 spaces per indent level).
const pad = (level: number): Run[] =>
  level > 0 ? [{ text: "    ".repeat(level), bold: false, italic: false }] : [];

function readBlocks(editor: LexicalEditor): Block[] {
  return editor.getEditorState().read(() => {
    const blocks: Block[] = [];
    for (const node of $getRoot().getChildren()) {
      if ($isListNode(node)) {
        // one exported line per item, with a bullet or number prefix
        const ordered = node.getListType() === "number";
        let n = 1;
        for (const item of node.getChildren()) {
          if (!$isElementNode(item)) continue;
          const prefix = ordered ? `${n++}. ` : "• ";
          blocks.push([...pad(item.getIndent()), { text: prefix, bold: false, italic: false }, ...inlineRuns(item)]);
        }
      } else if ($isElementNode(node)) {
        const runs = [...pad(node.getIndent()), ...inlineRuns(node)];
        // headings carry through as bold so they stand out in the document
        if ($isHeadingNode(node))
          runs.forEach((r) => {
            if (!("br" in r)) r.bold = true;
          });
        blocks.push(runs);
      }
    }
    return blocks;
  });
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function toHtml(blocks: Block[]): string {
  return blocks
    .map((block) => {
      const inner = block
        .map((run) => {
          if ("br" in run) return "<br/>";
          let t = esc(run.text);
          if (run.bold) t = `<strong>${t}</strong>`;
          if (run.italic) t = `<em>${t}</em>`;
          return t;
        })
        .join("");
      return `<p>${inner || "<br/>"}</p>`;
    })
    .join("\n");
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// A real .docx built with the docx library. The HTML-as-.doc trick is rejected
// by Word/Pages on macOS, whereas this is valid OOXML they open natively.
// Times New Roman 12pt with 1.5 line spacing to match the on-screen agreement.
export async function exportWord(editor: LexicalEditor) {
  const blocks = readBlocks(editor);
  const { Document, Packer, Paragraph, TextRun } = await import("docx");

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Times New Roman", size: 24 },
          paragraph: { spacing: { line: 360 } },
        },
      },
    },
    sections: [
      {
        children: blocks.map(
          (block) =>
            new Paragraph({
              children: block.map((run) =>
                "br" in run
                  ? new TextRun({ break: 1 })
                  : new TextRun({ text: run.text, bold: run.bold, italics: run.italic }),
              ),
            }),
        ),
      },
    ],
  });

  download(await Packer.toBlob(doc), "agreement.docx");
}

// The browser print dialog (Cmd/Ctrl+P). A hidden iframe avoids popup blockers;
// the content is inline HTML so it's ready to print synchronously.
export function printAgreement(editor: LexicalEditor) {
  const body = toHtml(readBlocks(editor));
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Agreement</title><style>@page{margin:1in;}body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.6;color:#111;}p{margin:0 0 1em;}</style></head><body>${body}</body></html>`;
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);
  const win = iframe.contentWindow!;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.onafterprint = () => iframe.remove();
  win.focus();
  win.print();
}

// A real, selectable .pdf rendered client-side. jsPDF's built-in Times covers
// Latin text; wrapping is done word-by-word so mixed bold/italic runs flow, and
// oversized tokens (e.g. long signature underscores) break by character.
export async function exportPdf(editor: LexicalEditor) {
  const blocks = readBlocks(editor);
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const margin = 56;
  const pageH = doc.internal.pageSize.getHeight();
  const right = doc.internal.pageSize.getWidth() - margin;
  const fontSize = 12;
  const lineH = fontSize * 1.5;
  doc.setFontSize(fontSize);

  let x = margin;
  let y = margin + fontSize;

  const newline = () => {
    x = margin;
    y += lineH;
    if (y > pageH - margin) {
      doc.addPage();
      y = margin + fontSize;
    }
  };

  for (const block of blocks) {
    for (const run of block) {
      if ("br" in run) {
        newline();
        continue;
      }
      doc.setFont("times", run.bold && run.italic ? "bolditalic" : run.bold ? "bold" : run.italic ? "italic" : "normal");
      const spaceW = doc.getTextWidth(" ");
      for (const word of run.text.split(/\s+/).filter(Boolean)) {
        const w = doc.getTextWidth(word);
        if (x > margin && x + w > right) newline();
        if (w <= right - margin) {
          doc.text(word, x, y);
          x += w + spaceW;
        } else {
          // token wider than the page — break it across lines by character
          let chunk = "";
          for (const ch of word) {
            if (x + doc.getTextWidth(chunk + ch) > right) {
              doc.text(chunk, x, y);
              newline();
              chunk = ch;
            } else chunk += ch;
          }
          doc.text(chunk, x, y);
          x += doc.getTextWidth(chunk) + spaceW;
        }
      }
    }
    // paragraph gap
    newline();
    y += lineH * 0.5;
    if (y > pageH - margin) {
      doc.addPage();
      y = margin + fontSize;
    }
    x = margin;
  }

  doc.save("agreement.pdf");
}
