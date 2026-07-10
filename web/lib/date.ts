// Human-readable current date (e.g. "July 10, 2026"), shared by the extract
// and generate prompts so both speak of "today" in exactly the same format.
export function today(): string {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
