const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kuala_Lumpur",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** Formats a date as `DD MMM YYYY` in Asia/Kuala_Lumpur. Throws RangeError if invalid. */
export function formatDate(input: Date | string): string {
  return formatter.format(typeof input === "string" ? new Date(input) : input);
}
