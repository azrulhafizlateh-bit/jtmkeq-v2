const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kuala_Lumpur",
  day: "2-digit",
  month: "numeric",
  year: "numeric",
});

/** Formats a date as `DD MMM YYYY` in Asia/Kuala_Lumpur. Throws RangeError if invalid. */
export function formatDate(input: Date | string): string {
  const parts = formatter.formatToParts(typeof input === "string" ? new Date(input) : input);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")} ${MONTHS[Number(get("month")) - 1]} ${get("year")}`;
}
