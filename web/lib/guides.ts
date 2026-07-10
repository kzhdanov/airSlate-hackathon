// Shared guide content for the "Save a chat as a PDF" modal. Keyed by the tab
// id so the modal and the standalone /guides/* pages read from one source.
export type GuideKey = "gmail" | "whatsapp" | "telegram";

export type GuideContent = {
  label: string;
  title: string;
  intro: string;
  steps: string[];
  note: string;
};

export const GUIDE_ORDER: GuideKey[] = ["gmail", "whatsapp", "telegram"];

export const guides: Record<GuideKey, GuideContent> = {
  gmail: {
    label: "Gmail",
    title: "Save a Gmail thread as a PDF",
    intro: "Turn an email conversation with the other party into a single PDF you can upload.",
    steps: [
      "Open Gmail on your computer and open the thread you want to save.",
      'If it has several replies, click "Expand all" (the ⌄ icon) so every message is visible.',
      "Click the printer icon in the top-right corner of the thread.",
      'In the print dialog set Destination to "Save as PDF".',
      "Click Save, then upload that PDF here.",
    ],
    note: 'On mobile: open the thread in the Gmail app → three-dot menu → Print all, then choose "Save as PDF".',
  },
  whatsapp: {
    label: "WhatsApp",
    title: "Save a WhatsApp chat as a PDF",
    intro: "Export the conversation, then turn the exported file into a PDF.",
    steps: [
      "Open the chat in WhatsApp.",
      'Tap the contact or group name at the top, then scroll to "Export chat".',
      'Choose "Without media" to keep it text-only.',
      "Save or email the exported .txt file to yourself.",
      'Open it on your computer and print to "Save as PDF", then upload it here.',
    ],
    note: "Text-only exports read most reliably — the terms live in the messages, not the attachments.",
  },
  telegram: {
    title: "Save a Telegram chat as a PDF",
    label: "Telegram",
    intro: "Use Telegram Desktop to export the history, then print it to PDF.",
    steps: [
      "Open Telegram Desktop and open the chat.",
      'Click the ⋮ menu in the top-right → "Export chat history".',
      "Set the format to HTML and uncheck photos, video and files.",
      "Open the exported HTML file in your browser.",
      'Print it to "Save as PDF" and upload that PDF here.',
    ],
    note: "Export is only available on Telegram Desktop, not the mobile apps.",
  },
};
