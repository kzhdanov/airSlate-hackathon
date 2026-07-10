"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  type EditorState,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  KEY_DOWN_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  REDO_COMMAND,
  type TextFormatType,
  UNDO_COMMAND,
} from "lexical";
import {
  $createHeadingNode,
  $isHeadingNode,
  HeadingNode,
  type HeadingTagType,
  QuoteNode,
} from "@lexical/rich-text";
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { $setBlocksType } from "@lexical/selection";
import { mergeRegister } from "@lexical/utils";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  Bold,
  Heading1,
  Heading2,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  Pilcrow,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { exportPdf, exportWord, printAgreement } from "./exportAgreement";

type BlockType = "paragraph" | "h1" | "h2" | "ul" | "ol";

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

// ── Modifier symbols for tooltip hints ──────────────────────────────────────
const isMac = typeof navigator !== "undefined" && /Mac|iP(hone|ad)/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl+";
const SHIFT = isMac ? "⇧" : "Shift+";
const ALT = isMac ? "⌥" : "Alt+";

// A toolbar control with a dark hover tooltip (name + shortcut).
function TBtn({
  onClick,
  active,
  disabled,
  label,
  hotkey,
  tip = "center",
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  hotkey?: string;
  tip?: "left" | "center" | "right";
  children: ReactNode;
}) {
  const pos =
    tip === "left" ? "left-0" : tip === "right" ? "right-0" : "left-1/2 -translate-x-1/2";
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={active}
        className={`flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[13px] font-semibold transition-colors disabled:opacity-35 ${
          active
            ? "bg-accent text-white"
            : "text-muted hover:bg-hero hover:text-ink disabled:hover:bg-transparent disabled:hover:text-muted"
        }`}
      >
        {children}
      </button>
      <span
        className={`pointer-events-none absolute top-full z-30 mt-2 flex items-center gap-1.5 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100 ${pos}`}
      >
        {label}
        {hotkey && <span className="text-white/55">{hotkey}</span>}
      </span>
    </div>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px flex-none bg-line" />;
}

function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [blockType, setBlockType] = useState<BlockType>("paragraph");
  const [formats, setFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  });

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    setFormats({
      bold: selection.hasFormat("bold"),
      italic: selection.hasFormat("italic"),
      underline: selection.hasFormat("underline"),
      strikethrough: selection.hasFormat("strikethrough"),
    });
    const anchor = selection.anchor.getNode();
    const el = anchor.getKey() === "root" ? anchor : anchor.getTopLevelElementOrThrow();
    if ($isListNode(el)) setBlockType(el.getListType() === "number" ? "ol" : "ul");
    else if ($isHeadingNode(el)) setBlockType(el.getTag() as BlockType);
    else setBlockType("paragraph");
  }, []);

  const format = useCallback(
    (f: TextFormatType) => editor.dispatchCommand(FORMAT_TEXT_COMMAND, f),
    [editor],
  );

  const setParagraph = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) $setBlocksType(selection, () => $createParagraphNode());
    });
  }, [editor]);

  const toggleHeading = useCallback(
    (tag: HeadingTagType) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        const anchor = selection.anchor.getNode();
        const el = anchor.getKey() === "root" ? anchor : anchor.getTopLevelElementOrThrow();
        const same = $isHeadingNode(el) && el.getTag() === tag;
        $setBlocksType(selection, () => (same ? $createParagraphNode() : $createHeadingNode(tag)));
      });
    },
    [editor],
  );

  const toggleList = useCallback(
    (kind: "ul" | "ol") => {
      const current = editor.getEditorState().read((): BlockType => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return "paragraph";
        const anchor = selection.anchor.getNode();
        const el = anchor.getKey() === "root" ? anchor : anchor.getTopLevelElementOrThrow();
        if ($isListNode(el)) return el.getListType() === "number" ? "ol" : "ul";
        return "paragraph";
      });
      if (current === kind) editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
      else if (kind === "ul") editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
      else editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    },
    [editor],
  );

  // Keyboard shortcuts for the controls Lexical doesn't bind by default
  // (bold/italic/underline/undo/redo already work via the core plugins).
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return false;
      const k = e.key.toLowerCase();
      if (e.shiftKey && !e.altKey) {
        if (k === "s") return format("strikethrough"), e.preventDefault(), true;
        if (k === "8") return toggleList("ul"), e.preventDefault(), true;
        if (k === "7") return toggleList("ol"), e.preventDefault(), true;
      }
      if (e.altKey && !e.shiftKey) {
        if (k === "1") return toggleHeading("h1"), e.preventDefault(), true;
        if (k === "2") return toggleHeading("h2"), e.preventDefault(), true;
        if (k === "0") return setParagraph(), e.preventDefault(), true;
      }
      return false;
    },
    [format, toggleList, toggleHeading, setParagraph],
  );

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => editorState.read(updateToolbar)),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(KEY_DOWN_COMMAND, onKeyDown, COMMAND_PRIORITY_LOW),
    );
  }, [editor, updateToolbar, onKeyDown]);

  const exportBtn =
    "rounded-md border border-line px-2.5 py-1 text-[12px] font-semibold text-ink transition-colors hover:border-accent hover:text-accent";

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-surface px-3 py-2">
      <TBtn
        label="Undo"
        hotkey={`${MOD}Z`}
        tip="left"
        disabled={!canUndo}
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
      >
        <Undo2 size={16} />
      </TBtn>
      <TBtn
        label="Redo"
        hotkey={isMac ? `${SHIFT}${MOD}Z` : `${MOD}Y`}
        disabled={!canRedo}
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
      >
        <Redo2 size={16} />
      </TBtn>

      <Divider />

      <TBtn label="Body text" hotkey={`${ALT}${MOD}0`} active={blockType === "paragraph"} onClick={setParagraph}>
        <Pilcrow size={16} />
      </TBtn>
      <TBtn label="Heading 1" hotkey={`${ALT}${MOD}1`} active={blockType === "h1"} onClick={() => toggleHeading("h1")}>
        <Heading1 size={17} />
      </TBtn>
      <TBtn label="Heading 2" hotkey={`${ALT}${MOD}2`} active={blockType === "h2"} onClick={() => toggleHeading("h2")}>
        <Heading2 size={17} />
      </TBtn>

      <Divider />

      <TBtn label="Bold" hotkey={`${MOD}B`} active={formats.bold} onClick={() => format("bold")}>
        <Bold size={16} />
      </TBtn>
      <TBtn label="Italic" hotkey={`${MOD}I`} active={formats.italic} onClick={() => format("italic")}>
        <Italic size={16} />
      </TBtn>
      <TBtn label="Underline" hotkey={`${MOD}U`} active={formats.underline} onClick={() => format("underline")}>
        <Underline size={16} />
      </TBtn>
      <TBtn
        label="Strikethrough"
        hotkey={`${SHIFT}${MOD}S`}
        active={formats.strikethrough}
        onClick={() => format("strikethrough")}
      >
        <Strikethrough size={16} />
      </TBtn>

      <Divider />

      <TBtn label="Bullet list" hotkey={`${SHIFT}${MOD}8`} active={blockType === "ul"} onClick={() => toggleList("ul")}>
        <List size={16} />
      </TBtn>
      <TBtn
        label="Numbered list"
        hotkey={`${SHIFT}${MOD}7`}
        active={blockType === "ol"}
        onClick={() => toggleList("ol")}
      >
        <ListOrdered size={16} />
      </TBtn>

      <Divider />

      <TBtn
        label="Decrease indent"
        hotkey={`${SHIFT}Tab`}
        onClick={() => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)}
      >
        <IndentDecrease size={16} />
      </TBtn>
      <TBtn
        label="Increase indent"
        hotkey="Tab"
        onClick={() => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)}
      >
        <IndentIncrease size={16} />
      </TBtn>

      <div className="ml-auto flex items-center gap-1.5 pl-2">
        <button type="button" className={exportBtn} onClick={() => exportPdf(editor)}>
          PDF
        </button>
        <button type="button" className={exportBtn} onClick={() => exportWord(editor)}>
          Word
        </button>
        <button
          type="button"
          className={exportBtn}
          onClick={() => printAgreement(editor)}
          title="Print / Save as PDF"
        >
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
        nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
        onError: (error) => console.error(error),
        theme: {
          paragraph: "mb-4 last:mb-0",
          heading: {
            h1: "font-display text-[22px] font-bold mt-2 mb-3",
            h2: "font-display text-[18px] font-bold mt-2 mb-2",
          },
          list: {
            ul: "list-disc mb-4 pl-7",
            ol: "list-decimal mb-4 pl-7",
            listitem: "mb-1",
          },
          quote: "border-l-2 border-line pl-4 italic text-muted mb-4",
          text: {
            bold: "font-bold",
            italic: "italic",
            underline: "underline",
            strikethrough: "line-through",
            underlineStrikethrough: "underline line-through",
          },
        },
      }}
    >
      <div className="overflow-hidden rounded-[14px] border border-line bg-surface shadow-[0_12px_30px_rgba(0,0,0,0.05)]">
        <Toolbar />
        <div className="max-h-[56vh] overflow-y-auto">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                aria-label="Agreement text"
                className="min-h-[40vh] px-7 py-6 font-contract text-[14px] leading-[1.75] text-ink outline-none"
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <TabIndentationPlugin />
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
      </div>
    </LexicalComposer>
  );
}
