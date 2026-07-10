"use client";

import { useCallback } from "react";
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  type EditorState,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { exportPdf, exportWord, printAgreement } from "./exportAgreement";

// The agreement arrives as plain text: paragraphs separated by a blank line,
// with soft line breaks inside. Rebuild that structure as Lexical nodes so that
// exporting via getTextContent() round-trips back to the same shape.
function seed(text: string) {
  return () => {
    const root = $getRoot();
    if (root.getFirstChild()) return;
    for (const block of text.split(/\n{2,}/)) {
      const paragraph = $createParagraphNode();
      block.split("\n").forEach((line, i) => {
        if (i > 0) paragraph.append($createLineBreakNode());
        if (line) paragraph.append($createTextNode(line));
      });
      root.append(paragraph);
    }
  };
}

function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const btn =
    "rounded-md px-2.5 py-1 text-[13px] font-semibold text-muted transition-colors hover:bg-hero hover:text-ink";
  const exportBtn =
    "rounded-md border border-line px-2.5 py-1 text-[12px] font-semibold text-ink transition-colors hover:border-accent hover:text-accent";
  return (
    <div className="flex items-center gap-1 border-b border-line bg-surface px-3 py-2">
      <button type="button" className={btn} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}>
        Undo
      </button>
      <button type="button" className={btn} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}>
        Redo
      </button>
      <span className="mx-1 h-4 w-px bg-line" />
      <button
        type="button"
        className={`${btn} font-bold`}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
      >
        B
      </button>
      <button
        type="button"
        className={`${btn} italic`}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
      >
        I
      </button>
      <div className="ml-auto flex items-center gap-1.5">
        <button type="button" className={exportBtn} onClick={() => exportPdf(editor)}>
          PDF
        </button>
        <button type="button" className={exportBtn} onClick={() => exportWord(editor)}>
          Word
        </button>
        <button type="button" className={exportBtn} onClick={() => printAgreement(editor)} title="Print / Save as PDF (⌘P)">
          Print
        </button>
      </div>
    </div>
  );
}

export default function AgreementEditor({
  initialText,
  onChange,
}: {
  initialText: string;
  onChange: (text: string) => void;
}) {
  const handleChange = useCallback(
    (state: EditorState) => {
      state.read(() => onChange($getRoot().getTextContent()));
    },
    [onChange],
  );

  return (
    <LexicalComposer
      initialConfig={{
        namespace: "agreement",
        editorState: seed(initialText),
        onError: (error) => console.error(error),
        theme: {
          paragraph: "mb-4 last:mb-0",
          text: { bold: "font-bold", italic: "italic" },
        },
      }}
    >
      <div className="overflow-hidden rounded-[14px] border border-line bg-surface shadow-[0_12px_30px_rgba(0,0,0,0.05)]">
        <Toolbar />
        <div className="max-h-[56vh] overflow-y-auto">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="min-h-[40vh] px-7 py-6 font-contract text-[14px] leading-[1.75] text-ink outline-none" />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
      </div>
    </LexicalComposer>
  );
}
