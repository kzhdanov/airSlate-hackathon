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
  const btn = "rounded px-2 py-1 text-sm hover:bg-gray-100";
  return (
    <div className="flex items-center gap-1 border-b border-gray-200 px-3 py-2">
      <button type="button" className={btn} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}>
        Undo
      </button>
      <button type="button" className={btn} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}>
        Redo
      </button>
      <span className="mx-1 h-4 w-px bg-gray-200" />
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
      <div className="ml-auto flex items-center gap-1">
        <button type="button" className={btn} onClick={() => exportPdf(editor)}>
          PDF
        </button>
        <button type="button" className={btn} onClick={() => exportWord(editor)}>
          Word
        </button>
        <button type="button" className={btn} onClick={() => printAgreement(editor)} title="Print / Save as PDF (⌘P)">
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
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <Toolbar />
        <div className="max-h-[70vh] overflow-y-auto">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="min-h-[40vh] p-8 font-serif text-[15px] leading-relaxed text-gray-900 outline-none" />
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
