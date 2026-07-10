import Guide from "../_components/Guide";

export const metadata = { title: "Save a WhatsApp chat as a PDF — Agreement Builder" };

export default function WhatsAppGuide() {
  return (
    <Guide
      title="Save a WhatsApp chat as a PDF"
      intro="Export the conversation, then save it as a PDF you can upload."
      sections={[
        {
          heading: "iPhone",
          steps: [
            "Open the chat with the other party.",
            "Tap the contact or group name at the top to open its info screen.",
            "Scroll down and tap “Export Chat”.",
            "Choose “Without Media” — you only need the text.",
            "In the share sheet, tap “Save to Files” (or email it to yourself). This saves a .txt file.",
            "Open the .txt file, tap Share → Print, pinch out on the preview, then Share → “Save to Files” to store it as a PDF.",
          ],
        },
        {
          heading: "Android",
          steps: [
            "Open the chat with the other party.",
            "Tap the three-dot menu (top-right) → More → “Export chat”.",
            "Choose “Without media”.",
            "Save or send the .txt file to yourself (e.g. via Gmail or Drive).",
            "Open the .txt file and use Print → “Save as PDF” to store it as a PDF.",
          ],
        },
      ]}
      note="WhatsApp exports the conversation as a plain .txt file — the extra print step just turns that text into a PDF. Media isn't needed for the contract."
    />
  );
}
