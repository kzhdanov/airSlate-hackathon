import Guide from "../_components/Guide";

export const metadata = { title: "Save a Gmail thread as a PDF — Agreement Builder" };

export default function GmailGuide() {
  return (
    <Guide
      title="Save a Gmail thread as a PDF"
      intro="Turn an email conversation with the other party into a single PDF you can upload."
      sections={[
        {
          steps: [
            "Open Gmail on your computer and open the email thread you want to save.",
            "If the thread has several replies, click “Expand all” (the ⌄ icon on the right) so every message is visible.",
            "Click the printer icon in the top-right corner of the thread — this prints the whole conversation.",
            "In the print dialog, set Destination (or Printer) to “Save as PDF”.",
            "Click Save, pick a location, and upload that PDF to Agreement Builder.",
          ],
        },
      ]}
      note="On mobile: open the thread in the Gmail app, tap the three-dot menu on a message → Print all, then choose “Save as PDF” in the print sheet."
    />
  );
}
