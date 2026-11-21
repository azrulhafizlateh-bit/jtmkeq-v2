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

  it.each([
    ["2026-01-15", "15 Jan 2026"],
    ["2026-02-15", "15 Feb 2026"],
    ["2026-03-15", "15 Mar 2026"],
    ["2026-04-15", "15 Apr 2026"],
    ["2026-05-15", "15 May 2026"],
    ["2026-06-15", "15 Jun 2026"],
    ["2026-07-15", "15 Jul 2026"],
    ["2026-08-15", "15 Aug 2026"],
    ["2026-09-05", "05 Sep 2026"],
    ["2026-10-15", "15 Oct 2026"],
    ["2026-11-15", "15 Nov 2026"],
    ["2026-12-15", "15 Dec 2026"],
  ])("formats %s as %s (fixed three-letter month)", (input, expected) => {
    expect(formatDate(input)).toBe(expected);
  });

  it("rolls over into the new year in Asia/Kuala_Lumpur", () => {
    expect(formatDate("2026-12-31T16:30:00Z")).toBe("01 Jan 2027");
  });

  it("formats a leap day", () => {
    expect(formatDate("2028-02-29")).toBe("29 Feb 2028");
  });
});
