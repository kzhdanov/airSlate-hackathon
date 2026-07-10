import Guide from "../_components/Guide";

export const metadata = { title: "Save a Telegram chat as a PDF — Agreement Builder" };

export default function TelegramGuide() {
  return (
    <Guide
      title="Save a Telegram chat as a PDF"
      intro="Use Telegram Desktop to export the conversation, then save it as a PDF."
      sections={[
        {
          steps: [
            "Open Telegram Desktop on your computer (chat export isn't available in the mobile apps).",
            "Open the chat with the other party.",
            "Click the three-dot menu in the top-right corner → “Export chat history”.",
            "Set the format to “HTML”, and untick photos / videos / files if you only need the text.",
            "Click Export, wait for it to finish, then open the exported “messages.html” file in your browser.",
            "In the browser, press Ctrl / Cmd + P → set Destination to “Save as PDF” → Save.",
          ],
        },
      ]}
      note="Only Telegram Desktop can export chat history. If you use Telegram on your phone, install the desktop app and log in to export the chat from there."
    />
  );
}
