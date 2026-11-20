import { describe, expect, it } from "vitest";
import { formatDate } from "@/lib/utils/date";

describe("formatDate", () => {
  it("rolls a UTC evening over to the next day in Asia/Kuala_Lumpur", () => {
    expect(formatDate("2026-11-20T17:30:00Z")).toBe("21 Nov 2026");
  });

  it("formats a date-only string as DD MMM YYYY", () => {
    expect(formatDate("2026-01-05")).toBe("05 Jan 2026");
  });

  it("accepts a Date instance", () => {
    expect(formatDate(new Date("2026-11-20T17:30:00Z"))).toBe("21 Nov 2026");
  });

  it("throws RangeError for an invalid date string", () => {
    expect(() => formatDate("not-a-date")).toThrow(RangeError);
  });
});
